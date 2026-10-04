import {
  RESTJSONErrorCodes,
  type ChatInputCommandInteraction,
  type Guild,
  type User,
} from 'discord.js';
import { isDiscordError, UserError } from '../../../core/errors';
import { successEmbed } from '../../../core/ui';
import { tr } from '../../../locales/tr';
import type { ActionResult, Actor } from '../service';

export function actorOf(interaction: { user: User }): Actor {
  return { id: interaction.user.id, tag: interaction.user.tag };
}

/** Edits the deferred reply with the outcome, noting when the DM did not arrive. */
export async function replyWithResult(
  interaction: ChatInputCommandInteraction<'cached'>,
  message: string,
  result: ActionResult,
  extraLines: string[] = [],
): Promise<void> {
  const lines = [message, ...extraLines];
  if (result.dmSent === false) lines.push(`-# ${tr.moderation.dmFailed}`);
  await interaction.editReply({ embeds: [successEmbed(lines.join('\n'))] });
}

export async function assertNotBanned(guild: Guild, userId: string): Promise<void> {
  try {
    await guild.bans.fetch({ user: userId, force: true });
  } catch (error) {
    if (isDiscordError(error, RESTJSONErrorCodes.UnknownBan)) return;
    throw error;
  }
  throw new UserError(tr.moderation.errors.alreadyBanned);
}

export async function assertBanned(guild: Guild, userId: string): Promise<void> {
  try {
    await guild.bans.fetch({ user: userId, force: true });
  } catch (error) {
    if (isDiscordError(error, RESTJSONErrorCodes.UnknownBan)) {
      throw new UserError(tr.errors.unknownBan);
    }
    throw error;
  }
}
