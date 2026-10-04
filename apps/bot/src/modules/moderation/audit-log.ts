import type { CaseType } from '@discordplus/shared';
import { AuditLogEvent, Events, type GuildAuditLogsEntry } from 'discord.js';
import type { BotContext } from '../../core/context';
import { defineEvent } from '../../core/types';

export interface ManualAction {
  type: CaseType;
  durationMs: number | null;
  expiresAt: Date | null;
}

type AuditEntry = Pick<GuildAuditLogsEntry, 'action' | 'changes'>;

/** Maps an audit log entry to the case it represents, or null for unrelated entries. */
export function manualActionFrom(entry: AuditEntry, now = Date.now()): ManualAction | null {
  switch (entry.action) {
    case AuditLogEvent.MemberBanAdd:
      return { type: 'ban', durationMs: null, expiresAt: null };
    case AuditLogEvent.MemberBanRemove:
      return { type: 'unban', durationMs: null, expiresAt: null };
    case AuditLogEvent.MemberKick:
      return { type: 'kick', durationMs: null, expiresAt: null };
    case AuditLogEvent.MemberUpdate: {
      const change = entry.changes.find((c) => c.key === 'communication_disabled_until');
      if (!change) return null;
      if (typeof change.new !== 'string')
        return { type: 'untimeout', durationMs: null, expiresAt: null };
      const expiresAt = new Date(change.new);
      const durationMs = expiresAt.getTime() - now;
      if (Number.isNaN(durationMs) || durationMs <= 0) return null;
      return { type: 'timeout', durationMs, expiresAt };
    }
    default:
      return null;
  }
}

async function userTag(ctx: BotContext, id: string): Promise<string> {
  const user = await ctx.client.users.fetch(id).catch(() => null);
  return user?.tag ?? id;
}

/**
 * Turns bans, kicks and timeouts done outside the bot (Discord's interface, other
 * bots, Discord AutoMod) into cases, so the case history is complete. The bot's
 * own actions are skipped; they already have a case.
 */
export const auditLogEvent = defineEvent({
  event: Events.GuildAuditLogEntryCreate,
  async handle(ctx, entry, guild) {
    const executorId = entry.executorId;
    if (!executorId || executorId === ctx.client.user?.id) return;
    const targetId = entry.targetId;
    if (!targetId) return;

    const action = manualActionFrom(entry);
    if (!action) return;

    await ctx.moderation.recordManual({
      guild,
      type: action.type,
      target: { id: targetId, tag: await userTag(ctx, targetId) },
      actor: { id: executorId, tag: entry.executor?.tag ?? (await userTag(ctx, executorId)) },
      reason: entry.reason,
      durationMs: action.durationMs,
      expiresAt: action.expiresAt,
    });
  },
});
