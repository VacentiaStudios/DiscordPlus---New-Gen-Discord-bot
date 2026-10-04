import { formatDuration, MAX_TEMP_BAN_MS } from '@discordplus/shared';
import { escapeMarkdown, PermissionFlagsBits } from 'discord.js';
import { named, slashCommand } from '../../../core/builders';
import { durationAutocomplete, parseDurationOption } from '../../../core/durations';
import { assertBotPermissions, assertMemberPermissions } from '../../../core/permissions';
import type { SlashCommand } from '../../../core/types';
import { tr } from '../../../locales/tr';
import { assertCanModerate } from '../hierarchy';
import { actorOf, assertBanned, assertNotBanned, replyWithResult } from './shared';

const ban = tr.moderation.commands.ban;
const unban = tr.moderation.commands.unban;
const LIMITS = { max: MAX_TEMP_BAN_MS };

export const banCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('ban', 'yasakla', ban.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => named(o, 'user', 'kullanıcı', ban.user).setRequired(true))
    .addStringOption((o) => named(o, 'reason', 'sebep', ban.reason).setMaxLength(500))
    .addStringOption((o) => named(o, 'duration', 'süre', ban.duration).setAutocomplete(true))
    .addIntegerOption((o) =>
      named(o, 'delete_messages', 'mesajları-sil', ban.deleteMessages).addChoices(
        { name: ban.deleteNone, value: 0 },
        { name: ban.deleteHour, value: 3_600 },
        { name: ban.deleteDay, value: 86_400 },
        { name: ban.deleteWeek, value: 604_800 },
      ),
    )
    .toJSON(),
  autocomplete: durationAutocomplete(LIMITS),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.BanMembers);
    assertBotPermissions(interaction.guild, PermissionFlagsBits.BanMembers);

    const user = interaction.options.getUser('user', true);
    const member = interaction.options.getMember('user');
    assertCanModerate(interaction.member, user, member);
    const durationInput = interaction.options.getString('duration');
    const durationMs = durationInput ? parseDurationOption(durationInput, LIMITS) : null;
    await assertNotBanned(interaction.guild, user.id);

    await interaction.deferReply();
    const result = await ctx.moderation.ban({
      guild: interaction.guild,
      target: user,
      member,
      actor: actorOf(interaction),
      reason: interaction.options.getString('reason'),
      durationMs,
      deleteMessageSeconds: interaction.options.getInteger('delete_messages') ?? 0,
      source: 'command',
    });
    const name = escapeMarkdown(user.tag);
    await replyWithResult(
      interaction,
      durationMs
        ? tr.moderation.done.tempBan(name, formatDuration(durationMs), result.case.caseNumber)
        : tr.moderation.done.ban(name, result.case.caseNumber),
      result,
    );
  },
};

export const unbanCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('unban', 'yasak-kaldır', unban.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => named(o, 'user', 'kullanıcı', unban.user).setRequired(true))
    .addStringOption((o) => named(o, 'reason', 'sebep', unban.reason).setMaxLength(500))
    .toJSON(),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.BanMembers);
    assertBotPermissions(interaction.guild, PermissionFlagsBits.BanMembers);

    const user = interaction.options.getUser('user', true);
    await assertBanned(interaction.guild, user.id);

    await interaction.deferReply();
    const result = await ctx.moderation.unban({
      guild: interaction.guild,
      target: user,
      actor: actorOf(interaction),
      reason: interaction.options.getString('reason'),
      source: 'command',
    });
    await replyWithResult(
      interaction,
      tr.moderation.done.unban(escapeMarkdown(user.tag), result.case.caseNumber),
      result,
    );
  },
};
