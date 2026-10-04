import { Client, GatewayIntentBits, Options, Partials } from 'discord.js';
import type { Env } from './env';

export function createClient(env: Env): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      // Privileged: must be enabled in the Developer Portal.
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
    ],
    // Receive delete/update events for messages and members that are not cached.
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
    // Never ping anyone unless a call site opts in explicitly.
    allowedMentions: { parse: [] },
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: env.MESSAGE_CACHE_SIZE,
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: { interval: 300, lifetime: env.MESSAGE_CACHE_LIFETIME_SECONDS },
    },
  });
}
