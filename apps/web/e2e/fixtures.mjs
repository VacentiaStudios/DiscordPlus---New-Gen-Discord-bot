// Test data shared by the mock Discord API, the database seed and the specs.

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const SEND_MESSAGES = 1n << 11n;

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
    { id: '400000000000000005', type: TEXT, name: 'kurallar', position: 0, parent_id: null },
  ],
  [guilds.manager.id]: [
    { id: '400000000000000011', type: TEXT, name: 'genel', position: 0, parent_id: null },
  ],
};

export const rolesByGuild = {
  [guilds.owned.id]: [
    { id: guilds.owned.id, name: '@everyone', color: 0, position: 0, managed: false },
    { id: '600000000000000001', name: 'Moderatör', color: 3447003, position: 2, managed: false },
    { id: '600000000000000002', name: 'Üye', color: 0, position: 1, managed: false },
  ],
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
