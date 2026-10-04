import {
  EmbedBuilder,
  MessageFlags,
  type InteractionReplyOptions,
  type RepliableInteraction,
} from 'discord.js';

export const COLORS = {
  brand: 0x5865f2,
  success: 0x23a55a,
  warning: 0xf0b232,
  danger: 0xda373c,
  neutral: 0x80848e,
} as const;

export function successEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ ${description}`);
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.danger).setDescription(`❌ ${description}`);
}

/**
 * Sends an ephemeral error, whatever state the interaction is in. A deferred
 * reply is edited so the "thinking…" indicator does not linger.
 */
export async function replyError(
  interaction: RepliableInteraction,
  message: string,
): Promise<void> {
  const embeds = [errorEmbed(message)];
  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply({ content: '', embeds, components: [] });
    return;
  }
  const options: InteractionReplyOptions = { embeds, flags: MessageFlags.Ephemeral };
  if (interaction.replied) await interaction.followUp(options);
  else await interaction.reply(options);
}
