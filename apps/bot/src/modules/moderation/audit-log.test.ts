import { AuditLogEvent, type GuildAuditLogsEntry } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { manualActionFrom } from './audit-log';

type Entry = Pick<GuildAuditLogsEntry, 'action' | 'changes'>;

function entry(action: AuditLogEvent, changes: Entry['changes'] = []): Entry {
  return { action, changes };
}

describe('manualActionFrom', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it.each([
    [AuditLogEvent.MemberBanAdd, 'ban'],
    [AuditLogEvent.MemberBanRemove, 'unban'],
    [AuditLogEvent.MemberKick, 'kick'],
  ] as const)('maps %s to %s', (action, type) => {
    expect(manualActionFrom(entry(action), now)?.type).toBe(type);
  });

  it('maps a timeout with its remaining duration', () => {
    const until = '2026-10-04T13:00:00.000Z';
    const result = manualActionFrom(
      entry(AuditLogEvent.MemberUpdate, [
        { key: 'communication_disabled_until', old: undefined, new: until },
      ] as Entry['changes']),
      now,
    );
    expect(result).toEqual({ type: 'timeout', durationMs: 3_600_000, expiresAt: new Date(until) });
  });

  it('maps a removed timeout to untimeout', () => {
    const result = manualActionFrom(
      entry(AuditLogEvent.MemberUpdate, [
        { key: 'communication_disabled_until', old: '2026-10-04T13:00:00.000Z', new: undefined },
      ] as Entry['changes']),
      now,
    );
    expect(result?.type).toBe('untimeout');
  });

  it('ignores other member updates and other actions', () => {
    expect(
      manualActionFrom(
        entry(AuditLogEvent.MemberUpdate, [
          { key: 'nick', old: 'a', new: 'b' },
        ] as Entry['changes']),
        now,
      ),
    ).toBeNull();
    expect(manualActionFrom(entry(AuditLogEvent.ChannelCreate), now)).toBeNull();
  });
});
