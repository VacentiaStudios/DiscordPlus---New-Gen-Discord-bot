import { EmbedBuilder, escapeMarkdown, type APIEmbedField, type User } from 'discord.js';
import { COLORS } from '../../core/ui';
import { tr } from '../../locales/tr';

const t = tr.automod;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Where it happened, what matched and the message text; shown with the case or AutoMod log. */
export function violationFields(input: {
  channelId: string;
  detail: string;
  content: string;
  edited: boolean;
}): APIEmbedField[] {
  const fields: APIEmbedField[] = [
    { name: t.channel, value: `<#${input.channelId}>`, inline: true },
    { name: t.match, value: truncate(escapeMarkdown(input.detail), 1_024), inline: true },
  ];
  if (input.content) {
    fields.push({
      name: input.edited ? t.edited : t.message,
      value: truncate(input.content, 1_024),
    });
  }
  return fields;
}

/** Moderation log entry for violations that did not create a case. */
export function automodEmbed(input: {
  user: Pick<User, 'id' | 'tag'>;
  label: string;
  outcome: string;
  fields: APIEmbedField[];
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(t.title(input.label))
    .setDescription(`<@${input.user.id}> · ${escapeMarkdown(input.user.tag)}`)
    .addFields({ name: t.action, value: input.outcome }, ...input.fields)
    .setFooter({ text: tr.logging.userId(input.user.id) })
    .setTimestamp();
}
