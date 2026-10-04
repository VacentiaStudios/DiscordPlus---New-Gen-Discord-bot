import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { slashCommand } from '../../core/builders';
import type { SlashCommand } from '../../core/types';
import { panelUrl } from '../../core/urls';
import { tr } from '../../locales/tr';

export const panelCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('panel', 'panel', tr.panel.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  async execute(interaction, ctx) {
    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(tr.panel.button)
      .setURL(panelUrl(ctx, interaction.guildId));
    await interaction.reply({
      content: tr.panel.message,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
