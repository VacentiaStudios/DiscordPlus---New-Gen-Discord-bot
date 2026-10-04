// Test data shared by the mock Discord API, the database seed and the specs.

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const VIEW_CHANNEL = 1n << 10n;
const SEND_MESSAGES = 1n << 11n;
const MANAGE_MESSAGES = 1n << 13n;
const EMBED_LINKS = 1n << 14n;
const ATTACH_FILES = 1n << 15n;
const READ_MESSAGE_HISTORY = 1n << 16n;

export const AUTH_SECRET = 'e2e-better-auth-secret-0123456789abcdef';

export const users = {
  alice: {
    id: 'e2e-user-alice',
    discordId: '200000000000000001',
    name: 'Alice',
    accessToken: 'e2e-token-alice',
    sessionToken: 'e2eSessionAlice0000000000000000a',
  },
  bob: {
    id: 'e2e-user-bob',
    discordId: '200000000000000002',
    name: 'Bob',
    accessToken: 'e2e-token-bob',
    sessionToken: 'e2eSessionBob00000000000000000b0',
  },
  // Used by the sign-out test, which destroys its session.
  carol: {
    id: 'e2e-user-carol',
    discordId: '200000000000000003',
    name: 'Carol',
    accessToken: 'e2e-token-carol',
    sessionToken: 'e2eSessionCarol0000000000000000c',
  },
};

export const guilds = {
  owned: {
    id: '300000000000000001',
    name: 'Alice Sunucusu',
    icon: null,
    owner: true,
    permissions: '0',
    botPresent: true,
  },
  admin: {
    id: '300000000000000002',
    name: 'Yönetici Sunucusu',
    icon: null,
    owner: false,
    permissions: ADMINISTRATOR.toString(),
    botPresent: false,
  },
  manager: {
    id: '300000000000000003',
    name: 'Çalışma Sunucusu',
    icon: null,
    owner: false,
    permissions: MANAGE_GUILD.toString(),
    botPresent: true,
  },
  member: {
    id: '300000000000000004',
    name: 'Üye Olunan Sunucu',
    icon: null,
    owner: false,
    permissions: SEND_MESSAGES.toString(),
    botPresent: true,
  },
};

/** What `GET /users/@me/guilds` returns for each access token. */
export const guildsByAccessToken = {
  [users.alice.accessToken]: [guilds.owned, guilds.admin, guilds.manager, guilds.member],
  [users.bob.accessToken]: [guilds.member],
  [users.carol.accessToken]: [guilds.owned],
};

const TEXT = 0;
const VOICE = 2;
const CATEGORY = 4;

/** The bot's user id; matches DISCORD_CLIENT_ID in e2e/env.ts. */
export const BOT_USER_ID = '100000000000000000';
const BOT_ROLE_ID = '600000000000000003';

const ROLE = 0;

/** What `GET /guilds/:id/channels` returns (bot token). */
export const channelsByGuild = {
  [guilds.owned.id]: [
    { id: '400000000000000001', type: CATEGORY, name: 'Genel', position: 0, parent_id: null },
    {
      id: '400000000000000002',
      type: TEXT,
      name: 'sohbet',
      position: 0,
      parent_id: '400000000000000001',
      // The bot may post here but not upload files.
      permission_overwrites: [
        { id: BOT_ROLE_ID, type: ROLE, allow: '0', deny: ATTACH_FILES.toString() },
      ],
    },
    {
      id: '400000000000000003',
      type: TEXT,
      name: 'mod-log',
      position: 1,
      parent_id: '400000000000000001',
    },
    {
      id: '400000000000000004',
      type: VOICE,
      name: 'Sesli Sohbet',
      position: 2,
      parent_id: '400000000000000001',
    },
    {
      id: '400000000000000005',
      type: TEXT,
      name: 'kurallar',
      position: 0,
      parent_id: null,
      // Read-only for everyone, the bot included.
      permission_overwrites: [
        { id: guilds.owned.id, type: ROLE, allow: '0', deny: SEND_MESSAGES.toString() },
      ],
    },
  ],
  [guilds.manager.id]: [
    { id: '400000000000000011', type: TEXT, name: 'genel', position: 0, parent_id: null },
  ],
};

export const rolesByGuild = {
  [guilds.owned.id]: [
    {
      id: guilds.owned.id,
      name: '@everyone',
      color: 0,
      position: 0,
      managed: false,
      permissions: (VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY).toString(),
    },
    {
      id: '600000000000000001',
      name: 'Moderatör',
      color: 3447003,
      position: 3,
      managed: false,
      permissions: MANAGE_MESSAGES.toString(),
    },
    {
      id: '600000000000000002',
      name: 'Üye',
      color: 0,
      position: 1,
      managed: false,
      permissions: '0',
    },
    {
      id: BOT_ROLE_ID,
      name: 'DPlus',
      color: 0,
      position: 2,
      managed: true,
      permissions: (EMBED_LINKS | ATTACH_FILES | MANAGE_MESSAGES).toString(),
    },
  ],
};

/** What `GET /guilds/:id/members/:botId` returns: the bot's roles. */
export const botRolesByGuild = {
  [guilds.owned.id]: [BOT_ROLE_ID],
};

export const BOT_TOKEN = 'e2e-bot-token';

/** Cases seeded into the owned guild. */
export const seededCases = [
  { type: 'warn', targetId: '500000000000000001', targetTag: 'spammer', reason: 'Spam' },
  {
    type: 'timeout',
    targetId: '500000000000000001',
    targetTag: 'spammer',
    reason: 'Tekrar spam',
    durationMs: 3_600_000,
  },
  { type: 'ban', targetId: '500000000000000002', targetTag: 'raider', reason: 'Baskın' },
];
