import {
  countActiveWarnings,
  createCase,
  deactivateCase,
  deactivateTempBans,
  setCaseLogMessage,
  type CaseRow,
  type Database,
} from '@discordplus/db';
import {
  DURATION,
  thresholdFor,
  type CaseSource,
  type CaseType,
  type Punishment,
  type WarnThreshold,
} from '@discordplus/shared';
import {
  RESTJSONErrorCodes,
  type APIEmbedField,
  type Client,
  type Guild,
  type GuildMember,
  type User,
} from 'discord.js';
import { isDiscordError } from '../../core/errors';
import { tr } from '../../locales/tr';
import type { Logger } from '../../logger';
import { sendLogMessage } from '../../services/log-channel';
import type { GuildSettingsService } from '../../services/settings';
import { auditReason, caseEmbed, dmEmbed, type DmInput } from './embeds';

export interface Actor {
  id: string;
  tag: string;
}

export interface ModerationDeps {
  client: Client;
  db: Database;
  logger: Logger;
  settings: GuildSettingsService;
  now?: () => number;
}

export interface ActionInput {
  guild: Guild;
  actor: Actor;
  reason?: string | null;
  source: CaseSource;
  metadata?: Record<string, unknown>;
  /**
   * Extra fields for the case's first mod-log message only; not stored (e.g. the
   * text of a message AutoMod removed).
   */
  logFields?: APIEmbedField[];
}

export interface ActionResult {
  case: CaseRow;
  /** Whether the DM reached the user; null when no DM was attempted. */
  dmSent: boolean | null;
  /** For warnings: active warnings after this one. */
  activeWarnings?: number;
  /** For warnings that reached a threshold. */
  escalation?: { threshold: WarnThreshold; result?: ActionResult; error?: unknown };
}

type Target = Pick<User, 'id' | 'tag'>;

/**
 * Carries out moderation actions the same way for commands, warning thresholds,
 * AutoMod and the scheduler: DM first (the user may be unreachable afterwards),
 * then the Discord action, then the case record and its mod-log message.
 */
export class ModerationService {
  constructor(private readonly deps: ModerationDeps) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  /** The bot itself as the moderator of automatic actions. */
  botActor(): Actor {
    const user = this.deps.client.user;
    return { id: user?.id ?? '0', tag: user?.tag ?? 'DiscordPlus' };
  }

  async warn(input: ActionInput & { target: GuildMember }): Promise<ActionResult> {
    const { guild, target } = input;
    const settings = await this.deps.settings.section(guild.id, 'moderation');
    const dmSent = await this.notify(target.user, settings.dmOnAction, {
      type: 'warn',
      guildName: guild.name,
      reason: input.reason ?? null,
    });
    const row = await this.record(input, 'warn', target.user, {});

    const since =
      settings.warnExpiryDays > 0
        ? new Date(this.now() - settings.warnExpiryDays * DURATION.DAY)
        : null;
    const activeWarnings = await countActiveWarnings(this.deps.db, guild.id, target.id, since);
    const result: ActionResult = { case: row, dmSent, activeWarnings };

    const threshold = thresholdFor(settings.thresholds, activeWarnings);
    if (threshold) {
      result.escalation = { threshold };
      try {
        result.escalation.result = await this.punish({
          guild,
          target,
          punishment: threshold.action,
          durationMs: threshold.durationMs,
          actor: this.botActor(),
          reason: tr.moderation.thresholdReason(activeWarnings, row.caseNumber),
          source: 'system',
        });
      } catch (error) {
        result.escalation.error = error;
        this.deps.logger.warn(
          { err: error, guildId: guild.id, targetId: target.id },
          'Warning threshold punishment failed',
        );
      }
    }
    return result;
  }

  async timeout(
    input: ActionInput & { target: GuildMember; durationMs: number },
  ): Promise<ActionResult> {
    const { guild, target, durationMs } = input;
    const settings = await this.deps.settings.section(guild.id, 'moderation');
    const dmSent = await this.notify(target.user, settings.dmOnAction, {
      type: 'timeout',
      guildName: guild.name,
      reason: input.reason ?? null,
      durationMs,
    });
    await target.timeout(durationMs, auditReason(input.actor.tag, input.reason));
    const row = await this.record(input, 'timeout', target.user, {
      durationMs,
      expiresAt: new Date(this.now() + durationMs),
    });
    return { case: row, dmSent };
  }

  async untimeout(input: ActionInput & { target: GuildMember }): Promise<ActionResult> {
    await input.target.timeout(null, auditReason(input.actor.tag, input.reason));
    const row = await this.record(input, 'untimeout', input.target.user, {});
    return { case: row, dmSent: null };
  }

  async kick(input: ActionInput & { target: GuildMember }): Promise<ActionResult> {
    const { guild, target } = input;
    const settings = await this.deps.settings.section(guild.id, 'moderation');
    const dmSent = await this.notify(target.user, settings.dmOnAction, {
      type: 'kick',
      guildName: guild.name,
      reason: input.reason ?? null,
    });
    await target.kick(auditReason(input.actor.tag, input.reason));
    const row = await this.record(input, 'kick', target.user, {});
    return { case: row, dmSent };
  }

  async ban(
    input: ActionInput & {
      target: User;
      /** Set when the user is a member; only members get a DM. */
      member?: GuildMember | null;
      durationMs?: number | null;
      deleteMessageSeconds?: number;
    },
  ): Promise<ActionResult> {
    const { guild, target } = input;
    const durationMs = input.durationMs ?? null;
    const settings = await this.deps.settings.section(guild.id, 'moderation');
    const dmSent = await this.notify(target, settings.dmOnAction && Boolean(input.member), {
      type: 'ban',
      guildName: guild.name,
      reason: input.reason ?? null,
      durationMs,
    });
    await guild.members.ban(target.id, {
      reason: auditReason(input.actor.tag, input.reason),
      deleteMessageSeconds: input.deleteMessageSeconds ?? 0,
    });
    const row = await this.record(input, 'ban', target, {
      durationMs,
      expiresAt: durationMs ? new Date(this.now() + durationMs) : null,
    });
    return { case: row, dmSent };
  }

  async unban(input: ActionInput & { target: User }): Promise<ActionResult> {
    await input.guild.members.unban(input.target.id, auditReason(input.actor.tag, input.reason));
    await deactivateTempBans(this.deps.db, input.guild.id, input.target.id);
    const row = await this.record(input, 'unban', input.target, {});
    return { case: row, dmSent: null };
  }

  /** Applies a configured punishment (warning thresholds, AutoMod) to a member. */
  async punish(
    input: ActionInput & {
      target: GuildMember;
      punishment: Punishment;
      durationMs: number | null;
    },
  ): Promise<ActionResult> {
    const { target } = input;
    switch (input.punishment) {
      case 'timeout':
        if (!target.moderatable) throw new Error('Member cannot be timed out by the bot');
        return this.timeout({ ...input, durationMs: input.durationMs ?? DURATION.HOUR });
      case 'kick':
        if (!target.kickable) throw new Error('Member cannot be kicked by the bot');
        return this.kick(input);
      case 'ban':
        if (!target.bannable) throw new Error('Member cannot be banned by the bot');
        return this.ban({ ...input, target: target.user, member: target });
    }
  }

  /** Lifts a temporary ban whose time is up; called by the scheduler. */
  async liftExpiredBan(guild: Guild, row: CaseRow): Promise<CaseRow> {
    const actor = this.botActor();
    const reason = tr.moderation.tempBanExpired(row.caseNumber);
    try {
      await guild.members.unban(row.targetId, auditReason(actor.tag, reason));
    } catch (error) {
      // Already unbanned by hand: nothing to lift.
      if (!isDiscordError(error, RESTJSONErrorCodes.UnknownBan)) throw error;
    }
    await deactivateCase(this.deps.db, row.id);
    return this.record(
      { guild, actor, reason, source: 'system' },
      'unban',
      {
        id: row.targetId,
        tag: row.targetTag,
      },
      {},
    );
  }

  /** Records an action taken outside the bot (Discord's interface, other bots). */
  async recordManual(input: {
    guild: Guild;
    type: CaseType;
    target: Target;
    actor: Actor;
    reason: string | null;
    durationMs?: number | null;
    expiresAt?: Date | null;
  }): Promise<CaseRow> {
    if (input.type === 'unban') {
      await deactivateTempBans(this.deps.db, input.guild.id, input.target.id);
    }
    return this.record(
      { guild: input.guild, actor: input.actor, reason: input.reason, source: 'manual' },
      input.type,
      input.target,
      { durationMs: input.durationMs ?? null, expiresAt: input.expiresAt ?? null },
    );
  }

  /** Re-renders a case's mod-log message after it was edited or deleted. */
  async refreshLogMessage(guild: Guild, row: CaseRow): Promise<void> {
    if (!row.logChannelId || !row.logMessageId) return;
    const channel = guild.channels.cache.get(row.logChannelId);
    if (!channel?.isTextBased()) return;
    try {
      const message = await channel.messages.fetch(row.logMessageId);
      await message.edit({ embeds: [caseEmbed(row)] });
    } catch (error) {
      this.deps.logger.debug({ err: error, caseId: row.id }, 'Could not update mod-log message');
    }
  }

  private async notify(user: User, enabled: boolean, dm: DmInput): Promise<boolean | null> {
    if (!enabled || user.bot) return null;
    try {
      await user.send({ embeds: [dmEmbed(dm)] });
      return true;
    } catch {
      return false;
    }
  }

  private async record(
    input: ActionInput,
    type: CaseType,
    target: Target,
    extra: { durationMs?: number | null; expiresAt?: Date | null },
  ): Promise<CaseRow> {
    const row = await createCase(this.deps.db, {
      guildId: input.guild.id,
      guildName: input.guild.name,
      type,
      source: input.source,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: input.actor.id,
      moderatorTag: input.actor.tag,
      reason: input.reason ?? null,
      durationMs: extra.durationMs ?? null,
      expiresAt: extra.expiresAt ?? null,
      metadata: input.metadata ?? null,
    });

    const message = await sendLogMessage(this.deps, input.guild, 'moderation', {
      embeds: [caseEmbed(row).addFields(input.logFields ?? [])],
    });
    if (!message) return row;
    await setCaseLogMessage(this.deps.db, row.id, message.channelId, message.id);
    return { ...row, logChannelId: message.channelId, logMessageId: message.id };
  }
}
