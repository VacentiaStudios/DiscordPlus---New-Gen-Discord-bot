// Case management: /vaka, /geçmiş and the "Moderasyon Geçmişi" context menu.
import {
  caseCountsByType,
  countActiveWarnings,
  countCases,
  deleteCase,
  getCase,
  listCases,
  updateCaseReason,
} from '@discordplus/db';
import { CASE_TYPE_LABELS, CASE_TYPES, DURATION } from '@discordplus/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  escapeMarkdown,
  MessageFlags,
  PermissionFlagsBits,
  time,
  TimestampStyles,
  type Guild,
  type InteractionReplyOptions,
  type User,
} from 'discord.js';
import { named, slashCommand, userContextCommand } from '../../../core/builders';
import type { BotContext } from '../../../core/context';
import { UserError } from '../../../core/errors';
import { assertMemberPermissions } from '../../../core/permissions';
import type { ComponentHandler, SlashCommand, UserContextCommand } from '../../../core/types';
import { COLORS, successEmbed } from '../../../core/ui';
import { panelUrl } from '../../../core/urls';
import { tr } from '../../../locales/tr';
import { CASE_EMOJI, caseEmbed } from '../embeds';

const t = tr.moderation.commands;
const PAGE_SIZE = 5;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function historyMessage(
  ctx: BotContext,
  guild: Guild,
  user: User,
  requestedPage: number,
): Promise<Pick<InteractionReplyOptions, 'embeds' | 'components'>> {
  const filter = { guildId: guild.id, targetId: user.id };
  const total = await countCases(ctx.db, filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 0, 0), pages - 1);

  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle(t.history.title(user.tag))
    .setThumbnail(user.displayAvatarURL({ size: 128 }));

  if (total === 0) {
    embed.setDescription(t.history.empty);
    return { embeds: [embed], components: [] };
  }

  const settings = await ctx.settings.section(guild.id, 'moderation');
  const since =
    settings.warnExpiryDays > 0
      ? new Date(Date.now() - settings.warnExpiryDays * DURATION.DAY)
      : null;
  const [rows, counts, activeWarnings] = await Promise.all([
    listCases(ctx.db, filter, { limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    caseCountsByType(ctx.db, filter),
    countActiveWarnings(ctx.db, guild.id, user.id, since),
  ]);

  const summary = CASE_TYPES.filter((type) => counts[type])
    .map((type) => `${CASE_TYPE_LABELS[type]}: **${counts[type]}**`)
    .join(' · ');
  const lines = rows.map(
    (row) =>
      `**#${row.caseNumber}** ${CASE_EMOJI[row.type]} ${CASE_TYPE_LABELS[row.type]} · ${time(row.createdAt, TimestampStyles.ShortDate)} · ${escapeMarkdown(row.moderatorTag)}\n` +
      (row.reason ? truncate(escapeMarkdown(row.reason), 150) : `_${tr.moderation.noReason}_`),
  );
  embed
    .setDescription(
      [summary, tr.moderation.activeWarnings(activeWarnings), '', ...lines].join('\n'),
    )
    .setFooter({ text: t.history.page(page + 1, pages) });

  const components =
    pages > 1
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`history:${user.id}:${page - 1}`)
              .setLabel(t.history.previous)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId(`history:${user.id}:${page + 1}`)
              .setLabel(t.history.next)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page >= pages - 1),
          ),
        ]
      : [];
  return { embeds: [embed], components };
}

export const historyCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('history', 'geçmiş', t.history.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => named(o, 'user', 'kullanıcı', t.history.user).setRequired(true))
    .toJSON(),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.ModerateMembers);
    const user = interaction.options.getUser('user', true);
    await interaction.reply({
      ...(await historyMessage(ctx, interaction.guild, user, 0)),
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const historyContextCommand: UserContextCommand = {
  type: 'user',
  data: userContextCommand(t.history.contextName, t.history.contextNameTr)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.ModerateMembers);
    await interaction.reply({
      ...(await historyMessage(ctx, interaction.guild, interaction.targetUser, 0)),
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const historyPagination: ComponentHandler = {
  prefix: 'history',
  async handle(interaction, [userId = '', page = '0'], ctx) {
    if (!interaction.isButton()) return;
    assertMemberPermissions(interaction, PermissionFlagsBits.ModerateMembers);
    const user = await ctx.client.users.fetch(userId);
    await interaction.update(await historyMessage(ctx, interaction.guild, user, Number(page)));
  },
};

export const caseCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('case', 'vaka', t.case.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      named(s, 'show', 'göster', t.case.show).addIntegerOption((o) =>
        named(o, 'number', 'numara', t.case.number).setRequired(true).setMinValue(1),
      ),
    )
    .addSubcommand((s) =>
      named(s, 'reason', 'sebep', t.case.reasonSub)
        .addIntegerOption((o) =>
          named(o, 'number', 'numara', t.case.number).setRequired(true).setMinValue(1),
        )
        .addStringOption((o) =>
          named(o, 'reason', 'sebep', t.case.reason).setRequired(true).setMaxLength(500),
        ),
    )
    .addSubcommand((s) =>
      named(s, 'delete', 'sil', t.case.delete).addIntegerOption((o) =>
        named(o, 'number', 'numara', t.case.number).setRequired(true).setMinValue(1),
      ),
    )
    .toJSON(),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.ModerateMembers);
    const number = interaction.options.getInteger('number', true);
    const existing = await getCase(ctx.db, interaction.guildId, number);
    if (!existing) throw new UserError(tr.moderation.errors.caseNotFound(number));

    switch (interaction.options.getSubcommand()) {
      case 'show': {
        const link = new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(t.case.openInPanel)
          .setURL(panelUrl(ctx, interaction.guildId, `/vakalar/${number}`));
        await interaction.reply({
          embeds: [caseEmbed(existing)],
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(link)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      case 'reason': {
        if (existing.deletedAt) throw new UserError(tr.moderation.errors.caseDeleted(number));
        const updated = await updateCaseReason(
          ctx.db,
          interaction.guildId,
          number,
          interaction.options.getString('reason', true),
        );
        if (updated) await ctx.moderation.refreshLogMessage(interaction.guild, updated);
        await interaction.reply({
          embeds: [successEmbed(t.case.reasonUpdated(number))],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      case 'delete': {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
          throw new UserError(tr.moderation.errors.deleteNeedsManageGuild);
        }
        if (existing.deletedAt) throw new UserError(tr.moderation.errors.caseDeleted(number));
        const deleted = await deleteCase(ctx.db, interaction.guildId, number, interaction.user.id);
        if (deleted) await ctx.moderation.refreshLogMessage(interaction.guild, deleted);
        await interaction.reply({
          embeds: [successEmbed(t.case.deleted(number))],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
  },
};
