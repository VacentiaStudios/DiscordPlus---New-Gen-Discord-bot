import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  Locale,
  SlashCommandBuilder,
  type LocalizationMap,
} from 'discord.js';

/**
 * Commands have an English base name and a Turkish localization: Turkish
 * Discord clients show `/yasakla`, every other client shows `/ban`.
 * Descriptions are Turkish for everyone.
 */
export function slashCommand(
  name: string,
  trName: string,
  description: string,
): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(name)
    .setNameLocalizations({ [Locale.Turkish]: trName })
    .setDescription(description)
    .setContexts(InteractionContextType.Guild);
}

export function userContextCommand(name: string, trName: string): ContextMenuCommandBuilder {
  return new ContextMenuCommandBuilder()
    .setName(name)
    .setNameLocalizations({ [Locale.Turkish]: trName })
    .setType(ApplicationCommandType.User)
    .setContexts(InteractionContextType.Guild);
}

interface Nameable {
  setName(name: string): unknown;
  setNameLocalizations(localizations: LocalizationMap | null): unknown;
  setDescription(description: string): unknown;
}

/** Names an option or subcommand the same way: English base, Turkish localization. */
export function named<T extends Nameable>(
  builder: T,
  name: string,
  trName: string,
  description: string,
): T {
  builder.setName(name);
  builder.setNameLocalizations({ [Locale.Turkish]: trName });
  builder.setDescription(description);
  return builder;
}

/** Name shown to Turkish users, e.g. in `/yardım`. */
export function turkishName(data: {
  name: string;
  name_localizations?: LocalizationMap | null;
}): string {
  return data.name_localizations?.[Locale.Turkish] ?? data.name;
}
