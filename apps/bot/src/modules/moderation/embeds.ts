import type { CaseRow } from '@discordplus/db';
import {
  CASE_SOURCE_LABELS,
  CASE_TYPE_LABELS,
  formatDuration,
  type CaseType,
} from '@discordplus/shared';
import { EmbedBuilder, escapeMarkdown, time, TimestampStyles } from 'discord.js';
import { COLORS } from '../../core/ui';
import { tr } from '../../locales/tr';

const CASE_COLORS: Record<CaseType, number> = {
  warn: COLORS.warning,
  timeout: 0xf47b2a,
  untimeout: COLORS.success,
  kick: 0xf47b2a,
  ban: COLORS.danger,
  unban: COLORS.success,
};

export const CASE_EMOJI: Record<CaseType, string> = {
  warn: '⚠️',
  timeout: '🔇',
  untimeout: '🔊',
  kick: '👢',
  ban: '🔨',
  unban: '🕊️',
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The embed posted to the moderation log channel (and shown by `/vaka göster`). */
export function caseEmbed(row: CaseRow): EmbedBuilder {
  const deleted = row.deletedAt !== null;
  const label = `${CASE_EMOJI[row.type]} Vaka #${row.caseNumber} · ${CASE_TYPE_LABELS[row.type]}`;
  const embed = new EmbedBuilder()
    .setColor(deleted ? COLORS.neutral : CASE_COLORS[row.type])
    .setTitle(deleted ? `~~${label}~~ (${tr.moderation.log.deleted})` : label)
    .addFields(
      {
        name: tr.moderation.log.user,
        value: `<@${row.targetId}> · ${escapeMarkdown(row.targetTag)}\n\`${row.targetId}\``,
        inline: true,
      },
      {
        name: tr.moderation.log.moderator,
        value: `<@${row.moderatorId}> · ${escapeMarkdown(row.moderatorTag)}`,
        inline: true,
      },
    )
    .setTimestamp(row.createdAt);

  if (row.durationMs !== null && (row.type === 'timeout' || row.type === 'ban')) {
    const ends = row.expiresAt
      ? ` · ${tr.moderation.log.ends} ${time(row.expiresAt, TimestampStyles.RelativeTime)}`
      : '';
    embed.addFields({
      name: tr.moderation.log.duration,
      value: `${formatDuration(row.durationMs)}${ends}`,
    });
  } else if (row.type === 'ban') {
    embed.addFields({ name: tr.moderation.log.duration, value: tr.moderation.permanent });
  }

  embed.addFields({
    name: tr.moderation.log.reason,
    value: row.reason ? truncate(row.reason, 1_000) : `_${tr.moderation.noReason}_`,
  });

  const footer = [`${tr.moderation.log.source}: ${CASE_SOURCE_LABELS[row.source]}`];
  if (deleted && row.deletedBy) footer.push(`Silen ID: ${row.deletedBy}`);
  embed.setFooter({ text: footer.join(' · ') });
  return embed;
}

export interface DmInput {
  type: 'warn' | 'timeout' | 'kick' | 'ban';
  guildName: string;
  reason: string | null;
  durationMs?: number | null;
}

/** The DM sent to a user before an action is taken against them. */
export function dmEmbed(input: DmInput): EmbedBuilder {
  const guild = escapeMarkdown(input.guildName);
  const duration = input.durationMs ? formatDuration(input.durationMs) : null;
  const description =
    input.type === 'warn'
      ? tr.moderation.dm.warn(guild)
      : input.type === 'timeout'
        ? tr.moderation.dm.timeout(guild, duration ?? '')
        : input.type === 'kick'
          ? tr.moderation.dm.kick(guild)
          : duration
            ? tr.moderation.dm.tempBan(guild, duration)
            : tr.moderation.dm.ban(guild);

  return new EmbedBuilder()
    .setColor(CASE_COLORS[input.type])
    .setDescription(`${CASE_EMOJI[input.type]} ${description}`)
    .addFields({
      name: tr.moderation.dm.reason,
      value: input.reason ? truncate(input.reason, 1_000) : tr.moderation.noReason,
    });
}

/** Reason passed to Discord's audit log: who did it and why. */
export function auditReason(actorTag: string, reason: string | null | undefined): string {
  return truncate(`${actorTag}: ${reason ?? tr.moderation.noReason}`, 512);
}
