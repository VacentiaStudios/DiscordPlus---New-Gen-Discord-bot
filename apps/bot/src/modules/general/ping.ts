import { MessageFlags } from 'discord.js';
import { slashCommand } from '../../core/builders';
import type { SlashCommand } from '../../core/types';
import { tr } from '../../locales/tr';

export const pingCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('ping', 'ping', tr.general.pingDescription).toJSON(),
  async execute(interaction, ctx) {
    const startedAt = Date.now();
    await interaction.reply({ content: tr.general.pinging, flags: MessageFlags.Ephemeral });
    await interaction.editReply(tr.general.pong(ctx.client.ws.ping, Date.now() - startedAt));
  },
};
