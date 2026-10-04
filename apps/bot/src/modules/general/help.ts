import { EmbedBuilder, MessageFlags } from 'discord.js';
import { slashCommand, turkishName } from '../../core/builders';
import type { SlashCommand } from '../../core/types';
import { COLORS } from '../../core/ui';
import { panelUrl } from '../../core/urls';
import { tr } from '../../locales/tr';

export const helpCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('help', 'yardım', tr.general.helpDescription).toJSON(),
  async execute(interaction, ctx) {
    const lines = [...ctx.registry.slash.values()]
      .map((command) => {
        const name = turkishName(command.data);
        const alias = name === command.data.name ? '' : ` (\`/${command.data.name}\`)`;
        return `**/${name}**${alias} — ${command.data.description}`;
      })
      .sort((a, b) => a.localeCompare(b, 'tr'));

    const embed = new EmbedBuilder()
      .setColor(COLORS.brand)
      .setTitle(tr.general.helpTitle)
      .setDescription(
        [...lines, '', tr.general.helpPanel(panelUrl(ctx, interaction.guildId))].join('\n'),
      )
      .setFooter({ text: tr.general.helpFooter });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
