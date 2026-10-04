import { MessageFlags, type Interaction } from 'discord.js';
import { tr } from '../locales/tr';
import type { BotContext } from './context';
import { describeError } from './errors';
import { replyError } from './ui';

/** Routes every interaction to its handler and turns failures into friendly replies. */
export async function handleInteraction(interaction: Interaction, ctx: BotContext): Promise<void> {
  try {
    await dispatch(interaction, ctx);
  } catch (error) {
    const described = describeError(error);
    const details = { err: error, errorId: described.errorId, interaction: summarize(interaction) };
    if (described.expected)
      ctx.logger.debug(details, 'Interaction failed with a user-facing error');
    else ctx.logger.error(details, 'Interaction handler failed');

    if (interaction.isRepliable()) {
      await replyError(interaction, described.message).catch((replyError: unknown) =>
        ctx.logger.warn({ err: replyError }, 'Could not report the error to the user'),
      );
    }
  }
}

async function dispatch(interaction: Interaction, ctx: BotContext): Promise<void> {
  if (interaction.isAutocomplete()) {
    if (!interaction.inCachedGuild()) return;
    const command = ctx.registry.slash.get(interaction.commandName);
    if (command?.autocomplete) await command.autocomplete(interaction, ctx);
    else await interaction.respond([]);
    return;
  }

  // Every command is registered as guild-only; this also guarantees cached guild data.
  if (!interaction.inCachedGuild()) {
    if (interaction.isRepliable()) {
      await interaction.reply({ content: tr.errors.guildOnly, flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = ctx.registry.slash.get(interaction.commandName);
    if (!command) return replyError(interaction, tr.errors.unknownCommand);
    return command.execute(interaction, ctx);
  }

  if (interaction.isUserContextMenuCommand()) {
    const command = ctx.registry.userContext.get(interaction.commandName);
    if (!command) return replyError(interaction, tr.errors.unknownCommand);
    return command.execute(interaction, ctx);
  }

  if (interaction.isMessageContextMenuCommand()) {
    const command = ctx.registry.messageContext.get(interaction.commandName);
    if (!command) return replyError(interaction, tr.errors.unknownCommand);
    return command.execute(interaction, ctx);
  }

  if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
    const [prefix = '', ...args] = interaction.customId.split(':');
    const handler = ctx.registry.components.get(prefix);
    if (!handler) return replyError(interaction, tr.errors.componentExpired);
    return handler.handle(interaction, args, ctx);
  }
}

function summarize(interaction: Interaction) {
  return {
    type: interaction.type,
    id: interaction.id,
    guildId: interaction.guildId,
    userId: interaction.user.id,
    command:
      interaction.isCommand() || interaction.isAutocomplete() ? interaction.commandName : undefined,
    customId:
      interaction.isMessageComponent() || interaction.isModalSubmit()
        ? interaction.customId
        : undefined,
  };
}
