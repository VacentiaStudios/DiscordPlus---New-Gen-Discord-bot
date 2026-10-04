// Registers the bot's application commands with Discord.
//
//   pnpm deploy-commands            → DEV_GUILD_ID set: that guild only (instant); otherwise global
//   pnpm deploy-commands --global   → global (can take a while to show up everywhere)
//   pnpm deploy-commands --clear    → removes the commands from the selected target
import { snowflakeSchema } from '@discordplus/shared';
import { REST, Routes } from 'discord.js';
import { z } from 'zod';
import { turkishName } from '../src/core/builders';
import { CommandRegistry } from '../src/core/registry';
import { modules } from '../src/modules';

const env = z
  .object({
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: snowflakeSchema,
    DEV_GUILD_ID: snowflakeSchema.optional(),
  })
  .parse(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== '')));

const guildId = process.argv.includes('--global') ? undefined : env.DEV_GUILD_ID;
const clear = process.argv.includes('--clear');

const body = clear ? [] : new CommandRegistry(modules).commandPayloads();
const route = guildId
  ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId)
  : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

const rest = new REST().setToken(env.DISCORD_TOKEN);
await rest.put(route, { body });

const target = guildId ? `test sunucusu ${guildId}` : 'tüm sunucular (global)';
if (clear) {
  console.log(`Komutlar kaldırıldı: ${target}`);
} else {
  console.log(`${body.length} komut kaydedildi: ${target}`);
  for (const command of body) console.log(`  /${turkishName(command)} (${command.name})`);
  if (!guildId) console.log('Global komutların tüm sunucularda görünmesi birkaç dakika sürebilir.');
}
