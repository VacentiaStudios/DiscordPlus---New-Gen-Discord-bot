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
