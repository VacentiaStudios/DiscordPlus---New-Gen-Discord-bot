import {
  AUTOMOD_FILTER_LABELS,
  AUTOMOD_FILTERS,
  type AutomodAction,
  type AutomodFilter,
  type AutomodSettings,
} from '@discordplus/shared';
import {
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type APIEmbedField,
  type Client,
  type Guild,
  type GuildMember,
  type Message,
  type PartialMessage,
} from 'discord.js';
import { channelLineage } from '../../core/channels';
import type { BotContext } from '../../core/context';
import { isDiscordError } from '../../core/errors';
import { isContentEdit } from '../../core/messages';
import { tr } from '../../locales/tr';
import { sendLogMessage } from '../../services/log-channel';
import { checkContent, CONTENT_FILTERS, type ContentContext } from './content';
import { BurstTracker } from './detectors';
import { automodEmbed, violationFields } from './embeds';
import { isExempt } from './exemptions';
import { InviteResolver, type InviteLookup } from './invites';
import { duplicateKey } from './normalize';
import { ProfanityMatcher } from './words';

interface MessageRef {
  messageId: string;
  channelId: string;
}

type Punishing = Exclude<AutomodAction, 'log' | 'delete'>;

interface Violation {
  message: Message<true>;
  member: GuildMember | null;
  settings: AutomodSettings;
  filter: AutomodFilter;
  detail: string;
  /** The messages to remove: the one that broke the rule, or a whole burst. */
  messages: MessageRef[];
  edited?: boolean;
}

export interface AutomodOptions {
  /** How invites are resolved; defaults to asking Discord with the bot's client. */
  lookupInvite?: InviteLookup;
  /** How long the notice in the channel stays before deleting itself. */
  noticeTtlMs?: number;
  /** At most one channel notice per user within this period. */
  noticeCooldownMs?: number;
  now?: () => number;
}

// Longest windows the settings allow; used to forget idle users.
const MAX_SPAM_WINDOW_MS = 60_000;
const MAX_DUPLICATE_WINDOW_MS = 300_000;

function isPunishing(action: AutomodAction): action is Punishing {
  return action !== 'log' && action !== 'delete';
}

function canPunish(member: GuildMember, action: Punishing): boolean {
  switch (action) {
    case 'warn':
      return true;
    case 'timeout':
      return member.moderatable;
    case 'kick':
      return member.kickable;
    case 'ban':
      return member.bannable;
  }
}

function discordInviteLookup(client: Client): InviteLookup {
  return async (code) => {
    try {
      const invite = await client.fetchInvite(code);
      return invite.guild?.id ?? null;
    } catch (error) {
      if (isDiscordError(error, RESTJSONErrorCodes.UnknownInvite)) return null;
      throw error;
    }
  };
}

/** Deletes messages, in bulk per channel where possible. False when some could not be removed. */
async function deleteMessages(guild: Guild, refs: readonly MessageRef[]): Promise<boolean> {
  const byChannel = new Map<string, string[]>();
  for (const ref of refs) {
    byChannel.set(ref.channelId, [...(byChannel.get(ref.channelId) ?? []), ref.messageId]);
  }
  const me = guild.members.me;
  let removed = true;
  for (const [channelId, ids] of byChannel) {
    const channel = guild.channels.cache.get(channelId);
    if (
      !me ||
      !channel?.isTextBased() ||
      !channel.permissionsFor(me).has(PermissionFlagsBits.ManageMessages)
    ) {
      removed = false;
      continue;
    }
    try {
      if (ids.length === 1) await channel.messages.delete(ids[0]!);
      else await channel.bulkDelete(ids, true);
    } catch (error) {
      // Already gone (the author deleted it first) is fine.
      if (!isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) removed = false;
    }
  }
  return removed;
}

/**
 * Checks guild messages against the guild's AutoMod filters and acts on
 * violations. Rate filters (spam, duplicates) keep per-user state in memory;
 * content filters also run on edits.
 */
export class AutomodEngine {
  private readonly spam = new BurstTracker();
  private readonly duplicates = new BurstTracker();
  private readonly matchers = new WeakMap<AutomodSettings['profanity'], ProfanityMatcher>();
  private readonly noticeCooldowns = new Map<string, number>();
  private invites: InviteResolver | null = null;

  constructor(private readonly options: AutomodOptions = {}) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  async handleMessage(ctx: BotContext, message: Message): Promise<void> {
    if (!message.inGuild() || message.author.bot || message.webhookId || message.system) return;
    const settings = await ctx.settings.section(message.guildId, 'automod');
    if (!AUTOMOD_FILTERS.some((filter) => settings[filter].enabled)) return;
    const member = await this.memberOf(message);
    if (this.exempt(settings, message, member)) return;

    const ref = {
      messageId: message.id,
      channelId: message.channelId,
      at: message.createdTimestamp,
    };
    const userKey = `${message.guildId}:${message.author.id}`;
    const base = { message, member, settings };

    if (settings.spam.enabled) {
      const { maxMessages, perSeconds } = settings.spam;
      const result = this.spam.record(userKey, ref, {
        max: maxMessages,
        windowMs: perSeconds * 1_000,
      });
      if (result.type === 'burst') {
        return this.enforce(ctx, {
          ...base,
          filter: 'spam',
          detail: tr.automod.details.spam(result.entries.length, perSeconds),
          messages: result.entries,
        });
      }
      if (result.type === 'cooldown') {
        return this.removeQuietly(ctx, message, 'spam', settings.spam.action);
      }
    }

    const key = duplicateKey(message.content);
    if (settings.duplicates.enabled && key) {
      const { maxDuplicates, perSeconds } = settings.duplicates;
      const result = this.duplicates.record(`${userKey}:${key}`, ref, {
        max: maxDuplicates,
        windowMs: perSeconds * 1_000,
      });
      if (result.type === 'burst') {
        return this.enforce(ctx, {
          ...base,
          filter: 'duplicates',
          detail: tr.automod.details.duplicates(result.entries.length, perSeconds),
          messages: result.entries,
        });
      }
      if (result.type === 'cooldown') {
        return this.removeQuietly(ctx, message, 'duplicates', settings.duplicates.action);
      }
    }

    const hit = await checkContent(message.content, settings, this.contentContext(ctx, message));
    if (hit) await this.enforce(ctx, { ...base, ...hit, messages: [ref] });
  }

  /** Edited messages go through the content filters again. */
  async handleEdit(
    ctx: BotContext,
    before: Message | PartialMessage,
    after: Message,
  ): Promise<void> {
    if (!after.inGuild() || after.author.bot || after.webhookId || after.system) return;
    if (!isContentEdit(before, after)) return;
    const settings = await ctx.settings.section(after.guildId, 'automod');
    if (!CONTENT_FILTERS.some((filter) => settings[filter].enabled)) return;
    const member = await this.memberOf(after);
    if (this.exempt(settings, after, member)) return;

    const hit = await checkContent(after.content, settings, this.contentContext(ctx, after));
    if (!hit) return;
    await this.enforce(ctx, {
      message: after,
      member,
      settings,
      ...hit,
      messages: [{ messageId: after.id, channelId: after.channelId }],
      edited: true,
    });
  }

  /** Forgets idle users; call periodically. */
  sweep(): void {
    const now = this.now();
    this.spam.sweep(now, MAX_SPAM_WINDOW_MS);
    this.duplicates.sweep(now, MAX_DUPLICATE_WINDOW_MS);
    for (const [key, until] of this.noticeCooldowns) {
      if (until <= now) this.noticeCooldowns.delete(key);
    }
  }

  private async memberOf(message: Message<true>): Promise<GuildMember | null> {
    return (
      message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null))
    );
  }

  private exempt(
    settings: AutomodSettings,
    message: Message<true>,
    member: GuildMember | null,
  ): boolean {
    return isExempt(settings, {
      channelIds: channelLineage(message.guild, message.channelId),
      roleIds: member ? [...member.roles.cache.keys()] : [],
      canManageMessages: member
        ? message.channel.permissionsFor(member).has(PermissionFlagsBits.ManageMessages)
        : false,
    });
  }

  private contentContext(ctx: BotContext, message: Message<true>): ContentContext {
    return {
      guildId: message.guildId,
      vanityCode: message.guild.vanityURLCode,
      profanity: (settings) => this.matcher(settings),
      inviteGuildId: (code) => this.inviteResolver(ctx.client).guildIdOf(code),
    };
  }

  private matcher(settings: AutomodSettings['profanity']): ProfanityMatcher {
    // Settings objects are replaced when the panel saves, which drops the cached matcher.
    let matcher = this.matchers.get(settings);
    if (!matcher) {
      matcher = new ProfanityMatcher({
        useDefaultList: settings.useDefaultList,
        words: settings.words,
        allowed: settings.allowedWords,
      });
      this.matchers.set(settings, matcher);
    }
    return matcher;
  }

  private inviteResolver(client: Client): InviteResolver {
    this.invites ??= new InviteResolver(this.options.lookupInvite ?? discordInviteLookup(client));
    return this.invites;
  }

  /** The rest of a burst that was already dealt with: removed without another log or penalty. */
  private async removeQuietly(
    ctx: BotContext,
    message: Message<true>,
    filter: 'spam' | 'duplicates',
    action: AutomodAction,
  ): Promise<void> {
    if (action === 'log') return;
    ctx.deletionMarks.mark([message.id], tr.logging.automodDeleted(AUTOMOD_FILTER_LABELS[filter]));
    await deleteMessages(message.guild, [{ messageId: message.id, channelId: message.channelId }]);
  }

  private async enforce(ctx: BotContext, violation: Violation): Promise<void> {
    const { message, filter } = violation;
    const { action } = violation.settings[filter];
    const label = AUTOMOD_FILTER_LABELS[filter];

    const removing = action !== 'log';
    let removed = false;
    if (removing) {
      ctx.deletionMarks.mark(
        violation.messages.map((m) => m.messageId),
        tr.logging.automodDeleted(label),
      );
      removed = await deleteMessages(message.guild, violation.messages);
    }

    const fields = violationFields({
      channelId: message.channelId,
      detail: violation.detail,
      content: message.content,
      edited: violation.edited ?? false,
    });
    const notRemoved = removing && !removed ? tr.automod.outcome.notDeleted : null;
    const punished =
      isPunishing(action) &&
      (await this.punish(ctx, violation, action, label, [
        ...(notRemoved ? [{ name: tr.automod.action, value: notRemoved }] : []),
        ...fields,
      ]));

    // A case already reports itself in the moderation log; everything else is logged here.
    if (!punished) {
      const outcome = [
        !removing
          ? tr.automod.outcome.logged
          : (notRemoved ?? tr.automod.outcome.deleted(violation.messages.length)),
      ];
      if (isPunishing(action)) {
        outcome.push(tr.automod.outcome.punishFailed(tr.automod.punishments[action]));
      }
      await sendLogMessage(ctx, message.guild, 'moderation', {
        embeds: [
          automodEmbed({ user: message.author, label, outcome: outcome.join('\n'), fields }),
        ],
      });
    }

    if (removed && violation.settings.notifyChannel) await this.notify(ctx, message, label);
  }

  private async punish(
    ctx: BotContext,
    violation: Violation,
    action: Punishing,
    label: string,
    logFields: APIEmbedField[],
  ): Promise<boolean> {
    const { message, member } = violation;
    if (!member || !canPunish(member, action)) return false;
    const input = {
      guild: message.guild,
      target: member,
      actor: ctx.moderation.botActor(),
      reason: tr.automod.reason(label),
      source: 'automod' as const,
      metadata: { automod: { filter: violation.filter, channelId: message.channelId } },
      logFields,
    };
    try {
      if (action === 'warn') await ctx.moderation.warn(input);
      else {
        await ctx.moderation.punish({
          ...input,
          punishment: action,
          durationMs: violation.settings[violation.filter].durationMs,
        });
      }
      return true;
    } catch (error) {
      ctx.logger.warn(
        { err: error, guildId: message.guildId, filter: violation.filter },
        'AutoMod punishment failed',
      );
      return false;
    }
  }

  /** A short notice in the channel that deletes itself; at most one per user at a time. */
  private async notify(ctx: BotContext, message: Message<true>, label: string): Promise<void> {
    const key = `${message.guildId}:${message.author.id}`;
    const now = this.now();
    if ((this.noticeCooldowns.get(key) ?? 0) > now) return;
    this.noticeCooldowns.set(key, now + (this.options.noticeCooldownMs ?? 10_000));

    const me = message.guild.members.me;
    if (!me || !message.channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages)) return;
    try {
      const notice = await message.channel.send({
        content: tr.automod.notice(`<@${message.author.id}>`, label),
        allowedMentions: { users: [message.author.id] },
      });
      setTimeout(() => {
        notice.delete().catch(() => undefined);
      }, this.options.noticeTtlMs ?? 6_000).unref();
    } catch (error) {
      ctx.logger.debug({ err: error, guildId: message.guildId }, 'AutoMod notice failed');
    }
  }
}
