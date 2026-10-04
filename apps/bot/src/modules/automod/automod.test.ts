import {
  automodSettingsSchema,
  defaultGuildSettings,
  DURATION,
  type AutomodSettings,
} from '@discordplus/shared';
import {
  ChannelType,
  PermissionFlagsBits as P,
  SnowflakeUtil,
  type APIEmbed,
  type Client,
  type MessageCreateOptions,
} from 'discord.js';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '../../client';
import type { BotContext } from '../../core/context';
import type { Env } from '../../env';
import { DeletionMarks } from '../../services/deletion-marks';
import { GuildSettingsService } from '../../services/settings';
import {
  BASE_PERMISSIONS,
  connectFakeGateway,
  rawChannel,
  rawGuild,
  rawMember,
  rawOverwrite,
  rawRole,
  rawUser,
  runHandlers,
  type FakeGateway,
  type RestCall,
} from '../../testing/fake-gateway';
import { createAutomodModule } from './index';

const GUILD = '1000000000000000001';
const OTHER_GUILD = '1000000000000000099';
const BOT = rawUser('1000000000000000002', 'DPlus', { bot: true });
const OWNER = rawUser('1000000000000000003', 'sahip');
const AYSE = rawUser('1000000000000000004', 'ayse');
const MOD = rawUser('1000000000000000005', 'mod');
const VIP = rawUser('1000000000000000006', 'vip');
const BOSS = rawUser('1000000000000000007', 'patron');
const OTHER_BOT = rawUser('1000000000000000008', 'muzik', { bot: true });

const GENERAL = '2000000000000000001';
const OTHER = '2000000000000000002';
const MOD_LOG = '2000000000000000003';
const CATEGORY = '2000000000000000004';
const IN_CATEGORY = '2000000000000000005';
const READ_ONLY = '2000000000000000006';

const MOD_ROLE = '3000000000000000001';
const VIP_ROLE = '3000000000000000002';
const BOT_ROLE = '3000000000000000003';
const BOSS_ROLE = '3000000000000000004';

const env = { MESSAGE_CACHE_SIZE: 100, MESSAGE_CACHE_LIFETIME_SECONDS: 3_600 } as Env;

let client: Client;
let gateway: FakeGateway;
let automod: AutomodSettings;
let ctx: BotContext;
let handlers: { settled(): Promise<void> };
let rest: RestCall[];
let modLog: APIEmbed[][];
let notices: MessageCreateOptions[];
let moderation: { warn: ReturnType<typeof vi.fn>; punish: ReturnType<typeof vi.fn> };
let inviteGuilds: Record<string, string | null>;

function configure(value: unknown) {
  automod = automodSettingsSchema.parse(value);
}

let clock = Date.now();
function message(channelId: string, author: typeof AYSE, content: string, at = (clock += 100)) {
  return {
    id: SnowflakeUtil.generate({ timestamp: at }).toString(),
    channel_id: channelId,
    guild_id: GUILD,
    author,
    content,
    timestamp: new Date(at).toISOString(),
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: 0,
  };
}

async function send(channelId: string, author: typeof AYSE, content: string, at?: number) {
  const payload = message(channelId, author, content, at);
  gateway.dispatch('MESSAGE_CREATE', payload);
  await handlers.settled();
  return payload;
}

const deletes = () => rest.filter((call) => call.method === 'DELETE').map((call) => call.route);
const bulkDeletes = () =>
  rest
    .filter((call) => call.route.endsWith('/bulk-delete'))
    .map((call) => (call.body as { messages: string[] }).messages);
const fields = (embed: APIEmbed | undefined) =>
  Object.fromEntries((embed?.fields ?? []).map((f) => [f.name, f.value]));

beforeEach(() => {
  client = createClient(env);
  gateway = connectFakeGateway(client, BOT);
  gateway.dispatch(
    'GUILD_CREATE',
    rawGuild({
      id: GUILD,
      ownerId: OWNER.id,
      roles: [
        rawRole(GUILD, '@everyone', BASE_PERMISSIONS, 0),
        rawRole(MOD_ROLE, 'Moderatör', P.ManageMessages, 2),
        rawRole(VIP_ROLE, 'VIP', 0n, 1),
        rawRole(
          BOT_ROLE,
          'DPlus',
          P.ManageMessages | P.ModerateMembers | P.KickMembers | P.BanMembers,
          5,
          { managed: true },
        ),
        rawRole(BOSS_ROLE, 'Patron', 0n, 9),
      ],
      channels: [
        rawChannel(GENERAL, 'genel'),
        rawChannel(OTHER, 'sohbet'),
        rawChannel(MOD_LOG, 'mod-log'),
        rawChannel(CATEGORY, 'Yetkili', { type: ChannelType.GuildCategory }),
        rawChannel(IN_CATEGORY, 'yetkili-sohbet', { parentId: CATEGORY }),
        rawChannel(READ_ONLY, 'duyuru', {
          overwrites: [rawOverwrite(BOT_ROLE, 'role', 0n, P.ManageMessages)],
        }),
      ],
      members: [
        rawMember(BOT, [BOT_ROLE]),
        rawMember(OWNER),
        rawMember(AYSE),
        rawMember(MOD, [MOD_ROLE]),
        rawMember(VIP, [VIP_ROLE]),
        rawMember(BOSS, [BOSS_ROLE]),
        rawMember(OTHER_BOT),
      ],
    }),
  );

  configure({});
  const settings = new GuildSettingsService(
    () =>
      Promise.resolve({
        ...defaultGuildSettings(),
        logging: {
          ...defaultGuildSettings().logging,
          channels: { ...defaultGuildSettings().logging.channels, moderation: MOD_LOG },
        },
        automod,
      }),
    0,
  );
  moderation = { warn: vi.fn(() => Promise.resolve({})), punish: vi.fn(() => Promise.resolve({})) };
  ctx = {
    client,
    logger: pino({ level: 'silent' }),
    settings,
    deletionMarks: new DeletionMarks(),
    moderation: { ...moderation, botActor: () => ({ id: BOT.id, tag: 'DPlus' }) },
  } as unknown as BotContext;

  inviteGuilds = { kendi: GUILD, yabanci: OTHER_GUILD, eski: null };
  const module = createAutomodModule({
    lookupInvite: (code) => {
      if (code === 'bozuk') return Promise.reject(new Error('rate limited'));
      return Promise.resolve(inviteGuilds[code] ?? null);
    },
    noticeTtlMs: 5,
  });
  handlers = runHandlers(client, ctx, module.events ?? []);
  rest = gateway.captureRest();
  modLog = [];
  gateway.captureSends(MOD_LOG).mockImplementation((options: MessageCreateOptions) => {
    modLog.push((options.embeds ?? []).map((e) => ('toJSON' in e ? e.toJSON() : e)));
    return Promise.resolve({ id: 'log', channelId: MOD_LOG });
  });
  notices = [];
  for (const channelId of [GENERAL, OTHER, IN_CATEGORY, READ_ONLY]) {
    gateway.captureSends(channelId).mockImplementation((options: MessageCreateOptions) => {
      notices.push(options);
      return Promise.resolve({ id: 'notice', channelId, delete: () => Promise.resolve() });
    });
  }
});

afterEach(async () => {
  await client.destroy();
});

describe('content filters', () => {
  it('deletes profanity, warns through the moderation service and leaves a notice', async () => {
    configure({ profanity: { enabled: true, action: 'warn' } });
    const sent = await send(GENERAL, AYSE, 'hadi lan s1kt1r');

    expect(deletes()).toEqual([`/channels/${GENERAL}/messages/${sent.id}`]);
    expect(ctx.deletionMarks.take(sent.id)).toBe('AutoMod: Küfür');
    expect(moderation.warn).toHaveBeenCalledTimes(1);
    const input = moderation.warn.mock.calls[0]![0] as Record<string, unknown>;
    expect(input).toMatchObject({ reason: 'AutoMod · Küfür', source: 'automod' });
    expect(input.logFields).toEqual([
      { name: 'Kanal', value: `<#${GENERAL}>`, inline: true },
      { name: 'Eşleşen', value: 'siktir', inline: true },
      { name: 'Mesaj', value: 'hadi lan s1kt1r' },
    ]);
    // The case reports itself; no separate AutoMod entry.
    expect(modLog).toEqual([]);
    expect(notices).toEqual([
      {
        content: `<@${AYSE.id}>, mesajın AutoMod tarafından kaldırıldı: **Küfür**.`,
        allowedMentions: { users: [AYSE.id] },
      },
    ]);
  });

  it('leaves clean messages, bots and disabled filters alone', async () => {
    configure({ profanity: { enabled: true }, caps: { enabled: false } });
    await send(GENERAL, AYSE, 'bugün çok sıkıntılıyım ama iyiyim');
    await send(GENERAL, OTHER_BOT, 'siktir');
    await send(GENERAL, AYSE, 'NEDEN KİMSE CEVAP VERMİYOR BURADA');
    expect(rest).toEqual([]);
    expect(modLog).toEqual([]);
  });

  it('only logs when the action is "log"', async () => {
    configure({ caps: { enabled: true, action: 'log' } });
    await send(GENERAL, AYSE, 'NEDEN KİMSE CEVAP VERMİYOR BURADA');
    expect(rest).toEqual([]);
    expect(notices).toEqual([]);
    const [embed] = modLog[0]!;
    expect(embed?.title).toBe('🛡️ AutoMod · Büyük harf');
    expect(fields(embed)).toMatchObject({ Eylem: 'Yalnızca loglandı', Eşleşen: '%100 büyük harf' });
  });

  it('allows the server’s own invites and blocks others', async () => {
    configure({ invites: { enabled: true } });
    await send(GENERAL, AYSE, 'gelin: discord.gg/kendi');
    // Discord could not be asked: the benefit of the doubt.
    await send(GENERAL, AYSE, 'discord.gg/bozuk');
    expect(rest).toEqual([]);

    const sent = await send(
      GENERAL,
      AYSE,
      'bizim sunucu daha iyi https://discord.com/invite/yabanci',
    );
    expect(deletes()).toEqual([`/channels/${GENERAL}/messages/${sent.id}`]);
    expect(fields(modLog[0]?.[0])).toMatchObject({
      Eylem: 'Mesaj silindi',
      Eşleşen: 'discord.gg/yabanci',
    });

    await send(GENERAL, AYSE, 'discord.gg/eski');
    expect(deletes()).toHaveLength(2);
  });

  it('applies the link allowlist', async () => {
    configure({ links: { enabled: true } });
    await send(GENERAL, AYSE, 'bak https://www.youtube.com/watch?v=1');
    expect(rest).toEqual([]);
    await send(GENERAL, AYSE, 'bedava nitro https://nitro-hediye.example/al');
    expect(fields(modLog[0]?.[0]).Eşleşen).toBe('nitro-hediye.example');
  });

  it('kicks for mass mentions', async () => {
    configure({ mentions: { enabled: true, action: 'kick', maxMentions: 3 } });
    await send(GENERAL, AYSE, `<@${OWNER.id}> <@${MOD.id}> <@&${VIP_ROLE}>`);
    expect(moderation.punish).toHaveBeenCalledWith(
      expect.objectContaining({ punishment: 'kick', durationMs: null, source: 'automod' }),
    );
  });

  it('checks edited messages again', async () => {
    configure({ profanity: { enabled: true } });
    const sent = await send(GENERAL, AYSE, 'merhaba');
    gateway.dispatch('MESSAGE_UPDATE', {
      ...sent,
      content: 'amk',
      edited_timestamp: new Date().toISOString(),
    });
    await handlers.settled();
    expect(deletes()).toEqual([`/channels/${GENERAL}/messages/${sent.id}`]);
    expect(fields(modLog[0]?.[0])['Düzenlenen mesaj']).toBe('amk');
  });
});

describe('exemptions', () => {
  it('skips moderators unless told not to', async () => {
    configure({ profanity: { enabled: true } });
    await send(GENERAL, MOD, 'amk');
    expect(rest).toEqual([]);

    configure({ profanity: { enabled: true }, exemptModerators: false });
    await send(GENERAL, MOD, 'amk');
    expect(deletes()).toHaveLength(1);
  });

  it('skips exempt roles and channels, including whole categories', async () => {
    configure({
      profanity: { enabled: true },
      exemptRoleIds: [VIP_ROLE],
      exemptChannelIds: [CATEGORY],
    });
    await send(GENERAL, VIP, 'amk');
    await send(IN_CATEGORY, AYSE, 'amk');
    expect(rest).toEqual([]);
  });
});

describe('rate filters', () => {
  it('removes a spam burst in bulk and punishes once', async () => {
    configure({
      spam: { enabled: true, action: 'timeout', durationMs: 10 * DURATION.MINUTE },
    });
    const start = Date.now();
    const burst = [];
    for (let i = 0; i < 5; i += 1)
      burst.push(await send(GENERAL, AYSE, `mesaj ${i}`, start + i * 500));
    expect(bulkDeletes()).toEqual([burst.map((m) => m.id)]);
    expect(moderation.punish).toHaveBeenCalledTimes(1);
    expect(moderation.punish.mock.calls[0]![0]).toMatchObject({
      punishment: 'timeout',
      durationMs: 10 * DURATION.MINUTE,
      reason: 'AutoMod · Spam',
    });

    // The rest of the burst is removed quietly.
    const late = await send(GENERAL, AYSE, 'mesaj 5', start + 2_600);
    expect(deletes()).toEqual([`/channels/${GENERAL}/messages/${late.id}`]);
    expect(moderation.punish).toHaveBeenCalledTimes(1);
    expect(ctx.deletionMarks.take(late.id)).toBe('AutoMod: Spam');
  });

  it('catches the same message repeated across channels', async () => {
    configure({ duplicates: { enabled: true, maxDuplicates: 3 } });
    const start = Date.now();
    const first = await send(GENERAL, AYSE, 'Ucuz hesap satılır!', start);
    const second = await send(OTHER, AYSE, 'ucuz  hesap satılır!', start + 1_000);
    await send(GENERAL, AYSE, 'başka bir şey', start + 1_500);
    const third = await send(GENERAL, AYSE, 'UCUZ HESAP SATILIR!', start + 2_000);

    expect(bulkDeletes()).toEqual([[first.id, third.id]]);
    expect(deletes()).toEqual([`/channels/${OTHER}/messages/${second.id}`]);
    expect(fields(modLog[0]?.[0])).toMatchObject({
      Eylem: '3 mesaj silindi',
      Eşleşen: '30 sn içinde 3 kez aynı mesaj',
    });
  });
});

describe('when the bot cannot act', () => {
  it('reports punishments it cannot apply', async () => {
    configure({ profanity: { enabled: true, action: 'timeout', durationMs: DURATION.HOUR } });
    await send(GENERAL, BOSS, 'amk');
    expect(moderation.punish).not.toHaveBeenCalled();
    expect(fields(modLog[0]?.[0]).Eylem).toBe(
      'Mesaj silindi\nSusturma uygulanamadı: botun yetkisi veya rol sırası yetmiyor ya da kullanıcı sunucuda değil.',
    );
  });

  it('reports messages it cannot delete and stays quiet in the channel', async () => {
    configure({ profanity: { enabled: true } });
    await send(READ_ONLY, AYSE, 'amk');
    expect(rest).toEqual([]);
    expect(notices).toEqual([]);
    expect(fields(modLog[0]?.[0]).Eylem).toBe(
      'Mesaj silinemedi: botun bu kanalda Mesajları Yönet yetkisi yok.',
    );
  });
});
