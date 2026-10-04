// Commands that act on current members: kick, timeout, untimeout and warn.
import { formatDuration, MAX_TIMEOUT_MS, PUNISHMENT_LABELS } from '@discordplus/shared';
import { escapeMarkdown, PermissionFlagsBits, type GuildMember } from 'discord.js';
import { named, slashCommand } from '../../../core/builders';
import { durationAutocomplete, parseDurationOption } from '../../../core/durations';
import { UserError } from '../../../core/errors';
import { assertBotPermissions, assertMemberPermissions } from '../../../core/permissions';
import type { SlashCommand } from '../../../core/types';
import { tr } from '../../../locales/tr';
import { assertCanModerate } from '../hierarchy';
import type { ActionResult } from '../service';
import { actorOf, replyWithResult } from './shared';

const commands = tr.moderation.commands;
const TIMEOUT_LIMITS = { max: MAX_TIMEOUT_MS };

function requireMember(member: GuildMember | null): GuildMember {
  if (!member) throw new UserError(tr.moderation.errors.notMember);
  return member;
}

export const kickCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('kick', 'at', commands.kick.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => named(o, 'user', 'kullanıcı', commands.kick.user).setRequired(true))
    .addStringOption((o) => named(o, 'reason', 'sebep', commands.kick.reason).setMaxLength(500))
    .toJSON(),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.KickMembers);
    assertBotPermissions(interaction.guild, PermissionFlagsBits.KickMembers);
    const target = requireMember(interaction.options.getMember('user'));
    assertCanModerate(interaction.member, target.user, target);

    await interaction.deferReply();
    const result = await ctx.moderation.kick({
      guild: interaction.guild,
      target,
      actor: actorOf(interaction),
      reason: interaction.options.getString('reason'),
      source: 'command',
    });
    await replyWithResult(
      interaction,
      tr.moderation.done.kick(escapeMarkdown(target.user.tag), result.case.caseNumber),
      result,
    );
  },
};

export const timeoutCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('timeout', 'sustur', commands.timeout.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => named(o, 'user', 'kullanıcı', commands.timeout.user).setRequired(true))
    .addStringOption((o) =>
      named(o, 'duration', 'süre', commands.timeout.duration)
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((o) => named(o, 'reason', 'sebep', commands.timeout.reason).setMaxLength(500))
    .toJSON(),
  autocomplete: durationAutocomplete(TIMEOUT_LIMITS),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.ModerateMembers);
    assertBotPermissions(interaction.guild, PermissionFlagsBits.ModerateMembers);
    const target = requireMember(interaction.options.getMember('user'));
    assertCanModerate(interaction.member, target.user, target);
    if (target.permissions.has(PermissionFlagsBits.Administrator)) {
      throw new UserError(tr.moderation.errors.cannotTimeoutAdmin);
    }
    const durationMs = parseDurationOption(
      interaction.options.getString('duration', true),
      TIMEOUT_LIMITS,
    );

    await interaction.deferReply();
    const result = await ctx.moderation.timeout({
      guild: interaction.guild,
      target,
      durationMs,
      actor: actorOf(interaction),
      reason: interaction.options.getString('reason'),
      source: 'command',
    });
    await replyWithResult(
      interaction,
      tr.moderation.done.timeout(
        escapeMarkdown(target.user.tag),
        formatDuration(durationMs),
        result.case.caseNumber,
      ),
      result,
    );
  },
};

export const untimeoutCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('untimeout', 'susturma-kaldır', commands.untimeout.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => named(o, 'user', 'kullanıcı', commands.untimeout.user).setRequired(true))
    .addStringOption((o) =>
      named(o, 'reason', 'sebep', commands.untimeout.reason).setMaxLength(500),
    )
    .toJSON(),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.ModerateMembers);
    assertBotPermissions(interaction.guild, PermissionFlagsBits.ModerateMembers);
    const target = requireMember(interaction.options.getMember('user'));
    if (!target.isCommunicationDisabled()) throw new UserError(tr.moderation.errors.notTimedOut);
    assertCanModerate(interaction.member, target.user, target);

    await interaction.deferReply();
    const result = await ctx.moderation.untimeout({
      guild: interaction.guild,
      target,
      actor: actorOf(interaction),
      reason: interaction.options.getString('reason'),
      source: 'command',
    });
    await replyWithResult(
      interaction,
      tr.moderation.done.untimeout(escapeMarkdown(target.user.tag), result.case.caseNumber),
      result,
    );
  },
};

function escalationLines(result: ActionResult): string[] {
  const lines = [tr.moderation.activeWarnings(result.activeWarnings ?? 0)];
  const escalation = result.escalation;
  if (!escalation) return lines;
  if (escalation.result) {
    const label = PUNISHMENT_LABELS[escalation.threshold.action].toLocaleLowerCase('tr');
    const duration = escalation.threshold.durationMs
      ? ` (${formatDuration(escalation.threshold.durationMs)})`
      : '';
    lines.push(
      tr.moderation.escalated(
        escalation.threshold.count,
        `${label}${duration}`,
        escalation.result.case.caseNumber,
      ),
    );
  } else {
    lines.push(tr.moderation.escalationFailed(escalation.threshold.count));
  }
  return lines;
}

export const warnCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('warn', 'uyar', commands.warn.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => named(o, 'user', 'kullanıcı', commands.warn.user).setRequired(true))
    .addStringOption((o) =>
      named(o, 'reason', 'sebep', commands.warn.reason).setRequired(true).setMaxLength(500),
    )
    .toJSON(),
  async execute(interaction, ctx) {
    assertMemberPermissions(interaction, PermissionFlagsBits.ModerateMembers);
    const target = requireMember(interaction.options.getMember('user'));
    assertCanModerate(interaction.member, target.user, target);

    await interaction.deferReply();
    const result = await ctx.moderation.warn({
      guild: interaction.guild,
      target,
      actor: actorOf(interaction),
      reason: interaction.options.getString('reason', true),
      source: 'command',
    });
    await replyWithResult(
      interaction,
      tr.moderation.done.warn(escapeMarkdown(target.user.tag), result.case.caseNumber),
      result,
      escalationLines(result),
    );
  },
};
