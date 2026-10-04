import { getCase, listCases, schema, upsertGuildPresence } from '@discordplus/db';
import { createTestDatabase, type TestDatabase } from '@discordplus/db/testing';
import {
  defaultGuildSettings,
  DURATION,
  type GuildSettings,
  type ModerationSettings,
} from '@discordplus/shared';
import { DiscordAPIError, RESTJSONErrorCodes, type Client, type Guild } from 'discord.js';
import type { GuildMember, User } from 'discord.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../logger';
import { GuildSettingsService } from '../../services/settings';
import { ModerationService } from './service';

const GUILD_ID = '100000000000000001';
const BOT = { id: '900000000000000001', tag: 'DPlus' };
const MOD = { id: '200000000000000009', tag: 'mod' };

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.db.delete(schema.modCases);
  await testDb.db.delete(schema.guilds);
  await upsertGuildPresence(testDb.db, [{ id: GUILD_ID, name: 'Test', icon: null }]);
});

function fakeUser(id: string, tag: string, options: { dmFails?: boolean } = {}) {
  return {
    id,
    tag,
    bot: false,
    send: vi.fn(() =>
      options.dmFails ? Promise.reject(new Error('Cannot send messages')) : Promise.resolve({}),
    ),
  };
}

function fakeMember(user: ReturnType<typeof fakeUser>) {
  return {
    id: user.id,
    user,
    moderatable: true,
    kickable: true,
    bannable: true,
    timeout: vi.fn(() => Promise.resolve()),
    kick: vi.fn(() => Promise.resolve()),
  };
}

function fakeGuild() {
  return {
    id: GUILD_ID,
    name: 'Test',
    members: {
      me: null,
      ban: vi.fn(() => Promise.resolve()),
      unban: vi.fn(() => Promise.resolve()),
    },
    channels: { cache: new Map() },
  };
}

function setup(moderation: Partial<ModerationSettings> = {}) {
  const settings: GuildSettings = {
    ...defaultGuildSettings(),
    moderation: { ...defaultGuildSettings().moderation, ...moderation },
  };
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const service = new ModerationService({
    client: { user: BOT } as unknown as Client,
    db: testDb.db,
    logger: logger as unknown as Logger,
    settings: new GuildSettingsService(() => Promise.resolve(settings)),
  });
  return { service, guild: fakeGuild(), logger };
}

describe('ModerationService', () => {
  it('warns: DM first, then a case; thresholds escalate to the configured punishment', async () => {
    const { service, guild } = setup({
      thresholds: [{ count: 2, action: 'timeout', durationMs: DURATION.HOUR }],
    });
    const user = fakeUser('300000000000000001', 'target');
    const member = fakeMember(user);
    const input = {
      guild: guild as unknown as Guild,
      target: member as unknown as GuildMember,
      actor: MOD,
      reason: 'spam',
      source: 'command' as const,
    };

    const first = await service.warn(input);
    expect(first).toMatchObject({ dmSent: true, activeWarnings: 1 });
    expect(first.escalation).toBeUndefined();

    const second = await service.warn(input);
    expect(second.activeWarnings).toBe(2);
    expect(second.escalation?.result?.case).toMatchObject({
      type: 'timeout',
      source: 'system',
      moderatorId: BOT.id,
      durationMs: DURATION.HOUR,
      reason: '2 uyarıya ulaşıldı (Vaka #2)',
    });
    expect(member.timeout).toHaveBeenCalledWith(DURATION.HOUR, expect.stringContaining('DPlus'));
    // Two warnings and one escalation DM.
    expect(user.send).toHaveBeenCalledTimes(3);

    const cases = await listCases(testDb.db, { guildId: GUILD_ID });
    expect(cases.map((c) => [c.caseNumber, c.type])).toEqual([
      [3, 'timeout'],
      [2, 'warn'],
      [1, 'warn'],
    ]);
  });

  it('reports a failed escalation without failing the warning', async () => {
    const { service, guild, logger } = setup({
      thresholds: [{ count: 1, action: 'kick', durationMs: null }],
    });
    const member = { ...fakeMember(fakeUser('300000000000000001', 'target')), kickable: false };
    const result = await service.warn({
      guild: guild as unknown as Guild,
      target: member as unknown as GuildMember,
      actor: MOD,
      reason: 'spam',
      source: 'command',
    });
    expect(result.escalation?.error).toBeInstanceOf(Error);
    expect(member.kick).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does not DM when disabled and records unreachable DMs', async () => {
    const quiet = setup({ dmOnAction: false });
    const user = fakeUser('300000000000000001', 'target');
    const result = await quiet.service.kick({
      guild: quiet.guild as unknown as Guild,
      target: fakeMember(user) as unknown as GuildMember,
      actor: MOD,
      source: 'command',
    });
    expect(result.dmSent).toBeNull();
    expect(user.send).not.toHaveBeenCalled();

    const loud = setup();
    const closed = fakeUser('300000000000000002', 'closed', { dmFails: true });
    const member = fakeMember(closed);
    const kicked = await loud.service.kick({
      guild: loud.guild as unknown as Guild,
      target: member as unknown as GuildMember,
      actor: MOD,
      source: 'command',
    });
    expect(kicked.dmSent).toBe(false);
    expect(member.kick).toHaveBeenCalled();
  });

  it('temporary bans expire and are lifted by the scheduler path', async () => {
    const { service, guild } = setup();
    const user = fakeUser('300000000000000001', 'target');
    const banned = await service.ban({
      guild: guild as unknown as Guild,
      target: user as unknown as User,
      member: null,
      actor: MOD,
      reason: 'raid',
      durationMs: DURATION.DAY,
      deleteMessageSeconds: 3_600,
      source: 'command',
    });
    expect(guild.members.ban).toHaveBeenCalledWith(user.id, {
      reason: 'mod: raid',
      deleteMessageSeconds: 3_600,
    });
    // Not a member: no DM.
    expect(banned.dmSent).toBeNull();
    expect(banned.case).toMatchObject({ type: 'ban', active: true, durationMs: DURATION.DAY });
    expect(banned.case.expiresAt).toBeInstanceOf(Date);

    const unban = await service.liftExpiredBan(guild as unknown as Guild, banned.case);
    expect(guild.members.unban).toHaveBeenCalledWith(user.id, expect.stringContaining('Vaka #1'));
    expect(unban).toMatchObject({ type: 'unban', source: 'system', moderatorId: BOT.id });
    expect((await getCase(testDb.db, GUILD_ID, 1))?.active).toBe(false);
  });

  it('treats an already lifted ban as done', async () => {
    const { service, guild } = setup();
    const banned = await service.ban({
      guild: guild as unknown as Guild,
      target: fakeUser('300000000000000001', 'target') as unknown as User,
      actor: MOD,
      durationMs: DURATION.HOUR,
      source: 'command',
    });
    guild.members.unban.mockRejectedValueOnce(
      new DiscordAPIError(
        { code: RESTJSONErrorCodes.UnknownBan, message: 'Unknown Ban' },
        RESTJSONErrorCodes.UnknownBan,
        404,
        'DELETE',
        '/guilds/x/bans/y',
        {},
      ),
    );
    await expect(
      service.liftExpiredBan(guild as unknown as Guild, banned.case),
    ).resolves.toBeDefined();
    expect((await getCase(testDb.db, GUILD_ID, 1))?.active).toBe(false);
  });

  it('records manual actions without calling Discord', async () => {
    const { service, guild } = setup();
    const row = await service.recordManual({
      guild: guild as unknown as Guild,
      type: 'kick',
      target: { id: '300000000000000001', tag: 'target' },
      actor: MOD,
      reason: null,
    });
    expect(row).toMatchObject({ type: 'kick', source: 'manual', caseNumber: 1 });
    expect(guild.members.ban).not.toHaveBeenCalled();
  });
});
