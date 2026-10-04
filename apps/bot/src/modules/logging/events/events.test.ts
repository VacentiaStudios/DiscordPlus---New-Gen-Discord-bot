import { defaultGuildSettings, type LoggingSettings } from '@discordplus/shared';
import type { AttachmentBuilder } from 'discord.js';
import {
  ChannelType,
  PermissionFlagsBits as P,
  type APIEmbed,
  type Client,
  type MessageCreateOptions,
} from 'discord.js';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '../../../client';
import type { BotContext } from '../../../core/context';
import type { AnyEventHandler } from '../../../core/types';
import type { Env } from '../../../env';
import { DeletionMarks } from '../../../services/deletion-marks';
import { GuildSettingsService } from '../../../services/settings';
import {
  BASE_PERMISSIONS,
  connectFakeGateway,
  rawChannel,
  rawGuild,
  rawMember,
  rawOverwrite,
  rawRole,
  rawUser,
  type FakeGateway,
} from '../../../testing/fake-gateway';
import { loggingModule } from '../index';
import { createUserUpdateEvent } from './members';

const GUILD = '1000000000000000001';
const BOT = rawUser('1000000000000000002', 'DPlus', { bot: true });
const OWNER = rawUser('1000000000000000003', 'sahip');
const AYSE = rawUser('1000000000000000004', 'ayse', { global_name: 'Ayşe' });
const OTHER_BOT = rawUser('1000000000000000005', 'muzik', { bot: true });

const LOG = '2000000000000000001';
const GENERAL = '2000000000000000002';
const STAFF = '2000000000000000003';
const PRIVATE_CATEGORY = '2000000000000000004';
const SECRET = '2000000000000000005';
const VOICE_A = '2000000000000000006';
const VOICE_B = '2000000000000000007';
const NO_FILES_LOG = '2000000000000000008';

const MOD_ROLE = '3000000000000000001';
const BOT_ROLE = '3000000000000000002';

const env = { MESSAGE_CACHE_SIZE: 100, MESSAGE_CACHE_LIFETIME_SECONDS: 3_600 } as Env;

function guildPayload() {
  return rawGuild({
    id: GUILD,
    ownerId: OWNER.id,
    roles: [
      rawRole(GUILD, '@everyone', BASE_PERMISSIONS, 0),
      rawRole(MOD_ROLE, 'Moderatör', P.ManageMessages, 2),
      rawRole(BOT_ROLE, 'DPlus', P.ManageMessages, 1, { managed: true }),
    ],
    channels: [
      rawChannel(LOG, 'log'),
      rawChannel(GENERAL, 'genel', { topic: 'Sohbet' }),
      rawChannel(STAFF, 'yetkili'),
      rawChannel(PRIVATE_CATEGORY, 'Gizli', { type: ChannelType.GuildCategory }),
      rawChannel(SECRET, 'gizli', { parentId: PRIVATE_CATEGORY }),
      rawChannel(VOICE_A, 'Ses A', { type: ChannelType.GuildVoice }),
      rawChannel(VOICE_B, 'Ses B', { type: ChannelType.GuildVoice }),
      rawChannel(NO_FILES_LOG, 'log-dosyasiz', {
        overwrites: [rawOverwrite(BOT.id, 'member', 0n, P.AttachFiles)],
      }),
    ],
    members: [
      rawMember(BOT, [BOT_ROLE]),
      rawMember(OWNER),
      rawMember(AYSE, [MOD_ROLE]),
      rawMember(OTHER_BOT),
    ],
    voiceStates: [{ user_id: AYSE.id, channel_id: VOICE_A }],
  });
}

let client: Client;
let gateway: FakeGateway;
let logging: LoggingSettings;
let ctx: BotContext;
let pending: Promise<unknown>[];
let sent: { embeds: APIEmbed[]; files: readonly unknown[] }[];

function subscribe(handlers: readonly AnyEventHandler[]) {
  for (const handler of handlers) {
    const untyped = handler as unknown as {
      handle(ctx: BotContext, ...args: unknown[]): Promise<void> | void;
    };
    client.on(handler.event, (...args: unknown[]) => {
      pending.push(Promise.resolve(untyped.handle(ctx, ...args)));
    });
  }
}

/** Dispatches a gateway event and waits for the logging handlers to finish. */
async function emit(type: string, data: unknown) {
  gateway.dispatch(type, data);
  await Promise.all(pending.splice(0));
}

function captureLog(channelId: string) {
  const send = gateway.captureSends(channelId);
  send.mockImplementation((options: MessageCreateOptions) => {
    sent.push({
      embeds: (options.embeds ?? []).map((e) => ('toJSON' in e ? e.toJSON() : e)),
      files: options.files ?? [],
    });
    return Promise.resolve({ id: 'sent' });
  });
}

function fields(embed: APIEmbed | undefined): Record<string, string> {
  return Object.fromEntries((embed?.fields ?? []).map((f) => [f.name, f.value]));
}

let nextMessageId = 4000000000000000000n;
function messagePayload(channelId: string, author: typeof AYSE, content: string) {
  nextMessageId += 1n;
  return {
    id: nextMessageId.toString(),
    channel_id: channelId,
    guild_id: GUILD,
    author,
    content,
    timestamp: new Date().toISOString(),
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

beforeEach(() => {
  client = createClient(env);
  gateway = connectFakeGateway(client, BOT);
  gateway.dispatch('GUILD_CREATE', guildPayload());
  logging = {
    ...defaultGuildSettings().logging,
    channels: { moderation: null, message: LOG, member: LOG, server: LOG, voice: LOG },
    ignoredChannelIds: [STAFF, PRIVATE_CATEGORY],
  };
  const settings = new GuildSettingsService(() =>
    Promise.resolve({ ...defaultGuildSettings(), logging }),
  );
  ctx = {
    client,
    logger: pino({ level: 'silent' }),
    settings,
    deletionMarks: new DeletionMarks(),
  } as unknown as BotContext;
  pending = [];
  sent = [];
  const events = (loggingModule.events ?? []).filter((h) => h.event !== 'userUpdate');
  subscribe([...events, createUserUpdateEvent(0)]);
  captureLog(LOG);
});

afterEach(async () => {
  await client.destroy();
});

describe('message logs', () => {
  it('logs a deleted cached message with its content and author', async () => {
    const message = messagePayload(GENERAL, AYSE, 'merhaba dünya');
    await emit('MESSAGE_CREATE', message);
    await emit('MESSAGE_DELETE', { id: message.id, channel_id: GENERAL, guild_id: GUILD });

    expect(sent).toHaveLength(1);
    const embed = sent[0]!.embeds[0];
    expect(embed?.title).toBe('🗑️ Mesaj silindi');
    expect(embed?.description).toBe('merhaba dünya');
    expect(fields(embed).Yazar).toBe(`<@${AYSE.id}>`);
  });

  it('explains deletes of uncached messages', async () => {
    await emit('MESSAGE_DELETE', {
      id: '4100000000000000000',
      channel_id: GENERAL,
      guild_id: GUILD,
    });
    expect(sent[0]?.embeds[0]?.description).toContain('önbellekte değil');
  });

  it('labels messages the bot deleted on purpose', async () => {
    const message = messagePayload(GENERAL, AYSE, 'spam');
    await emit('MESSAGE_CREATE', message);
    ctx.deletionMarks.mark([message.id], '/temizle · <@1>');
    await emit('MESSAGE_DELETE', { id: message.id, channel_id: GENERAL, guild_id: GUILD });
    expect(fields(sent[0]?.embeds[0])['Silinme sebebi']).toBe('/temizle · <@1>');
  });

  it('skips ignored channels, their categories, bots and the log channel', async () => {
    for (const [channelId, author] of [
      [STAFF, AYSE],
      [SECRET, AYSE],
      [GENERAL, OTHER_BOT],
      [GENERAL, BOT],
      [LOG, AYSE],
    ] as const) {
      const message = messagePayload(channelId, author, 'gizli');
      await emit('MESSAGE_CREATE', message);
      await emit('MESSAGE_DELETE', { id: message.id, channel_id: channelId, guild_id: GUILD });
    }
    expect(sent).toHaveLength(0);
  });

  it('logs bot messages when bots are not ignored', async () => {
    logging.ignoreBots = false;
    const message = messagePayload(GENERAL, OTHER_BOT, 'şarkı çalıyor');
    await emit('MESSAGE_CREATE', message);
    await emit('MESSAGE_DELETE', { id: message.id, channel_id: GENERAL, guild_id: GUILD });
    expect(sent).toHaveLength(1);
  });

  it('does nothing when the message log is off', async () => {
    logging.channels.message = null;
    const message = messagePayload(GENERAL, AYSE, 'merhaba');
    await emit('MESSAGE_CREATE', message);
    await emit('MESSAGE_DELETE', { id: message.id, channel_id: GENERAL, guild_id: GUILD });
    expect(sent).toHaveLength(0);
  });

  it('logs edits with both versions but not pins', async () => {
    const message = messagePayload(GENERAL, AYSE, 'ilk hali');
    await emit('MESSAGE_CREATE', message);
    await emit('MESSAGE_UPDATE', { ...message, pinned: true });
    expect(sent).toHaveLength(0);

    await emit('MESSAGE_UPDATE', {
      ...message,
      content: 'son hali',
      edited_timestamp: new Date().toISOString(),
    });
    const embed = sent[0]?.embeds[0];
    expect(embed?.title).toBe('✏️ Mesaj düzenlendi');
    expect(fields(embed)).toMatchObject({ Önce: 'ilk hali', Sonra: 'son hali' });
  });

  it('logs fresh edits of uncached messages without the old text', async () => {
    const message = messagePayload(GENERAL, AYSE, 'yeni metin');
    await emit('MESSAGE_UPDATE', { ...message, edited_timestamp: new Date().toISOString() });
    expect(fields(sent[0]?.embeds[0]).Önce).toContain('önbellekte değil');
  });

  it('attaches a transcript to bulk deletes', async () => {
    const messages = [messagePayload(GENERAL, AYSE, 'bir'), messagePayload(GENERAL, OWNER, 'iki')];
    for (const message of messages) await emit('MESSAGE_CREATE', message);
    ctx.deletionMarks.mark(
      messages.map((m) => m.id),
      '/temizle · <@1>',
    );
    await emit('MESSAGE_DELETE_BULK', {
      ids: messages.map((m) => m.id),
      channel_id: GENERAL,
      guild_id: GUILD,
    });

    const [log] = sent;
    expect(log?.embeds[0]?.title).toBe('🧹 2 mesaj toplu silindi');
    expect(fields(log?.embeds[0])['Silinme sebebi']).toBe('/temizle · <@1>');
    const file = log?.files[0] as AttachmentBuilder;
    expect(file.name).toBe(`silinen-mesajlar-${GENERAL}.txt`);
    const text = (file.attachment as Buffer).toString('utf8');
    expect(text).toContain('ayse (1000000000000000004): bir');
    expect(text.indexOf('bir')).toBeLessThan(text.indexOf('iki'));
  });

  it('skips the transcript when the bot cannot attach files', async () => {
    logging.channels.message = NO_FILES_LOG;
    const noFiles: unknown[] = [];
    gateway.captureSends(NO_FILES_LOG).mockImplementation((options) => {
      noFiles.push(options);
      return Promise.resolve({ id: 'sent' });
    });
    await emit('MESSAGE_DELETE_BULK', {
      ids: ['4200000000000000001', '4200000000000000002'],
      channel_id: GENERAL,
      guild_id: GUILD,
    });
    const options = noFiles[0] as MessageCreateOptions;
    expect(options.files).toEqual([]);
    expect(JSON.stringify(options.embeds)).toContain('Dosya Ekle yetkisi yok');
  });
});

describe('member logs', () => {
  it('logs joins and leaves', async () => {
    const newcomer = rawUser('1000000000000000009', 'yeni');
    await emit('GUILD_MEMBER_ADD', { ...rawMember(newcomer), guild_id: GUILD });
    expect(sent[0]?.embeds[0]?.title).toBe('📥 Üye katıldı');

    await emit('GUILD_MEMBER_REMOVE', { user: AYSE, guild_id: GUILD });
    const left = sent[1]?.embeds[0];
    expect(left?.title).toBe('📤 Üye ayrıldı');
    expect(fields(left).Roller).toBe(`<@&${MOD_ROLE}>`);
  });

  it('logs nickname and role changes in one message', async () => {
    await emit('GUILD_MEMBER_UPDATE', {
      ...rawMember(AYSE, [], { nick: 'Ayşe Hanım' }),
      guild_id: GUILD,
    });
    const titles = sent[0]?.embeds.map((e) => e.title);
    expect(titles).toEqual(['🏷️ Takma ad değişti', '🎭 Roller güncellendi']);
    expect(fields(sent[0]?.embeds[1]).Kaldırılan).toBe(`<@&${MOD_ROLE}>`);
  });

  it('fans profile changes out to shared guilds', async () => {
    await emit('GUILD_MEMBER_UPDATE', {
      ...rawMember({ ...AYSE, username: 'ayse_yeni' }, [MOD_ROLE]),
      guild_id: GUILD,
    });
    const embed = sent[0]?.embeds[0];
    expect(embed?.title).toBe('👤 Kullanıcı bilgileri değişti');
    expect(fields(embed)['Kullanıcı adı']).toBe('ayse → ayse\\_yeni');
  });
});

describe('server logs', () => {
  it('summarises channel permission changes and skips reorders', async () => {
    await emit('CHANNEL_UPDATE', {
      ...rawChannel(GENERAL, 'genel', { topic: 'Sohbet', position: 5 }),
      guild_id: GUILD,
    });
    expect(sent).toHaveLength(0);

    await emit('CHANNEL_UPDATE', {
      ...rawChannel(GENERAL, 'sohbet', {
        topic: 'Sohbet',
        overwrites: [rawOverwrite(GUILD, 'role', 0n, P.SendMessages)],
      }),
      guild_id: GUILD,
    });
    const embed = sent[0]?.embeds[0];
    expect(fields(embed)).toMatchObject({
      Ad: 'genel → sohbet',
      'İzin geçersiz kılmaları': '@everyone: ⛔ Mesaj Gönder',
    });
  });

  it('logs role permission changes', async () => {
    await emit('GUILD_ROLE_UPDATE', {
      guild_id: GUILD,
      role: rawRole(MOD_ROLE, 'Moderatör', P.ManageMessages | P.BanMembers, 2),
    });
    expect(fields(sent[0]?.embeds[0]).İzinler).toBe('✅ Üyeleri Yasakla');
  });

  it('logs channel creation and server renames', async () => {
    await emit('CHANNEL_CREATE', {
      ...rawChannel('2000000000000000099', 'duyurular'),
      guild_id: GUILD,
    });
    expect(sent[0]?.embeds[0]?.title).toBe('📁 Kanal oluşturuldu');
    expect(fields(sent[0]?.embeds[0]).Tür).toBe('Metin kanalı');

    await emit('GUILD_UPDATE', { ...guildPayload(), name: 'Yeni Ad' });
    expect(fields(sent[1]?.embeds[0]).Ad).toBe('Test Sunucusu → Yeni Ad');
  });
});

describe('voice logs', () => {
  const voiceState = (userId: string, channelId: string | null, mute = false) => ({
    guild_id: GUILD,
    user_id: userId,
    channel_id: channelId,
    session_id: `session-${userId}`,
    deaf: false,
    mute,
    self_deaf: false,
    self_mute: false,
    self_video: false,
    suppress: false,
    request_to_speak_timestamp: null,
    member: rawMember(userId === AYSE.id ? AYSE : OWNER),
  });

  it('logs moves, server mutes and leaves', async () => {
    await emit('VOICE_STATE_UPDATE', voiceState(AYSE.id, VOICE_B));
    await emit('VOICE_STATE_UPDATE', voiceState(AYSE.id, VOICE_B, true));
    await emit('VOICE_STATE_UPDATE', voiceState(AYSE.id, null, true));
    expect(sent.map((s) => s.embeds[0]?.title)).toEqual([
      '↔️ Ses kanalı değiştirdi',
      '🎙️ Sunucu tarafından susturuldu',
      '🔇 Ses kanalından ayrıldı',
    ]);
  });

  it('ignores self mutes and ignored channels', async () => {
    await emit('VOICE_STATE_UPDATE', { ...voiceState(AYSE.id, VOICE_A), self_mute: true });
    logging.ignoredChannelIds = [VOICE_A];
    await emit('VOICE_STATE_UPDATE', voiceState(OWNER.id, VOICE_A));
    expect(sent).toHaveLength(0);
  });
});
