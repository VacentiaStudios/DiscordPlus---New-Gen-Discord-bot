// Channel moderation: purge, slowmode, lock and unlock.
import { deleteChannelLock, getChannelLock, saveChannelLock } from '@discordplus/db';
import { DURATION, formatDuration } from '@discordplus/shared';
import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  PermissionsBitField,
  type GuildBasedChannel,
  type GuildChannel,
} from 'discord.js';
import { named, slashCommand } from '../../../core/builders';
import {
  durationSuggestions,
  MAX_SLOWMODE_MS,
  parseDurationOption,
  SLOWMODE_PRESETS,
} from '../../../core/durations';
import { UserError } from '../../../core/errors';
import { assertBotPermissions, assertMemberPermissions } from '../../../core/permissions';
import type { SlashCommand } from '../../../core/types';
import { successEmbed } from '../../../core/ui';
import { tr } from '../../../locales/tr';
import { auditReason } from '../embeds';

const commands = tr.moderation.commands;
const BULK_DELETE_MAX_AGE_MS = 14 * DURATION.DAY - DURATION.MINUTE;

export const purgeCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('purge', 'temizle', commands.purge.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      named(o, 'amount', 'miktar', commands.purge.amount)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((o) => named(o, 'user', 'kullanıcı', commands.purge.user))
    .addStringOption((o) =>
      named(o, 'contains', 'içeren', commands.purge.contains).setMaxLength(100),
    )
    .toJSON(),
  async execute(interaction, ctx) {
    const channel = interaction.channel;
    if (!channel || !('bulkDelete' in channel)) {
      throw new UserError(tr.moderation.errors.textChannelOnly);
    }
    assertMemberPermissions(interaction, PermissionFlagsBits.ManageMessages);
    assertBotPermissions(
      interaction.guild,
      [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory],
      channel,
    );

    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains')?.toLocaleLowerCase('tr');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const fetched = await channel.messages.fetch({ limit: 100 });
    const now = Date.now();
    const targets = [...fetched.values()]
      .filter((message) => !message.pinned)
      .filter((message) => now - message.createdTimestamp < BULK_DELETE_MAX_AGE_MS)
      .filter((message) => !user || message.author.id === user.id)
      .filter((message) => !contains || message.content.toLocaleLowerCase('tr').includes(contains))
      .slice(0, amount);
    if (targets.length === 0) throw new UserError(tr.moderation.errors.nothingToPurge);

    ctx.deletionMarks.mark(
      targets.map((message) => message.id),
      tr.logging.purgedBy(interaction.user.toString()),
    );
    const deleted = await channel.bulkDelete(targets, true);
    const message =
      deleted.size < amount
        ? commands.purge.partial(deleted.size, amount)
        : commands.purge.done(deleted.size);
    await interaction.editReply({ embeds: [successEmbed(message)] });
  },
};

export const slowmodeCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('slowmode', 'yavaş-mod', commands.slowmode.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((o) =>
      named(o, 'duration', 'süre', commands.slowmode.duration)
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addChannelOption((o) =>
      named(o, 'channel', 'kanal', commands.slowmode.channel).addChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildVoice,
        ChannelType.GuildStageVoice,
        ChannelType.GuildForum,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
      ),
    )
    .toJSON(),
  async autocomplete(interaction) {
    const input = interaction.options.getFocused();
    const suggestions = durationSuggestions(
      input,
      { min: DURATION.SECOND, max: MAX_SLOWMODE_MS },
      SLOWMODE_PRESETS,
    );
    await interaction.respond(
      [{ name: commands.slowmode.off, value: '0' }, ...suggestions].slice(0, 25),
    );
  },
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel || !('setRateLimitPerUser' in channel)) {
      throw new UserError(tr.moderation.errors.textChannelOnly);
    }
    assertMemberPermissions(interaction, PermissionFlagsBits.ManageChannels);
    assertBotPermissions(interaction.guild, PermissionFlagsBits.ManageChannels, channel);

    const input = interaction.options.getString('duration', true).trim();
    const off = ['0', 'kapalı', 'kapali', 'kapat'].includes(input.toLocaleLowerCase('tr'));
    const ms = off ? 0 : parseDurationOption(input, { min: DURATION.SECOND, max: MAX_SLOWMODE_MS });
    if (ms > MAX_SLOWMODE_MS) throw new UserError(tr.moderation.errors.slowmodeTooLong);

    await channel.setRateLimitPerUser(
      Math.round(ms / 1_000),
      auditReason(interaction.user.tag, `/yavaş-mod ${input}`),
    );
    const mention = channel.toString();
    await interaction.reply({
      embeds: [
        successEmbed(
          ms === 0
            ? commands.slowmode.disabled(mention)
            : commands.slowmode.enabled(mention, formatDuration(ms)),
        ),
      ],
    });
  },
};

// What `/kilitle` denies to @everyone.
const LOCKED = {
  SendMessages: PermissionFlagsBits.SendMessages,
  SendMessagesInThreads: PermissionFlagsBits.SendMessagesInThreads,
  CreatePublicThreads: PermissionFlagsBits.CreatePublicThreads,
  CreatePrivateThreads: PermissionFlagsBits.CreatePrivateThreads,
} as const;

const LOCKABLE_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
] as const;

function lockableChannel(channel: GuildBasedChannel | null): GuildChannel & GuildBasedChannel {
  if (!channel || channel.isThread() || !('permissionOverwrites' in channel)) {
    throw new UserError(tr.moderation.errors.textChannelOnly);
  }
  return channel;
}

/** Previous state of a locked permission: allowed, denied, or inherited (null). */
export function previousState(
  allow: string | null,
  deny: string | null,
  bit: bigint,
): boolean | null {
  if (allow && (BigInt(allow) & bit) === bit) return true;
  if (deny && (BigInt(deny) & bit) === bit) return false;
  return null;
}

export const lockCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('lock', 'kilitle', commands.lock.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((o) =>
      named(o, 'channel', 'kanal', commands.lock.channel).addChannelTypes(...LOCKABLE_TYPES),
    )
    .addStringOption((o) => named(o, 'reason', 'sebep', commands.lock.reason).setMaxLength(500))
    .toJSON(),
  async execute(interaction, ctx) {
    const channel = lockableChannel(
      interaction.options.getChannel('channel') ?? interaction.channel,
    );
    assertMemberPermissions(interaction, PermissionFlagsBits.ManageChannels);
    assertBotPermissions(
      interaction.guild,
      [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
      channel,
    );
    if (await getChannelLock(ctx.db, channel.id)) {
      throw new UserError(tr.moderation.errors.alreadyLocked);
    }

    const everyone = interaction.guild.roles.everyone;
    const existing = channel.permissionOverwrites.cache.get(everyone.id);
    const reason = interaction.options.getString('reason');
    await saveChannelLock(ctx.db, {
      channelId: channel.id,
      guildId: interaction.guildId,
      previousAllow: existing ? existing.allow.bitfield.toString() : null,
      previousDeny: existing ? existing.deny.bitfield.toString() : null,
      lockedBy: interaction.user.id,
      reason,
    });
    try {
      await channel.permissionOverwrites.edit(
        everyone,
        Object.fromEntries(Object.keys(LOCKED).map((name) => [name, false])),
        { reason: auditReason(interaction.user.tag, reason) },
      );
    } catch (error) {
      await deleteChannelLock(ctx.db, channel.id);
      throw error;
    }

    await interaction.reply({ embeds: [successEmbed(commands.lock.done(channel.toString()))] });
    if (channel.id !== interaction.channelId && channel.isTextBased()) {
      await channel.send({ content: commands.lock.notice }).catch(() => undefined);
    }
  },
};

export const unlockCommand: SlashCommand = {
  type: 'slash',
  data: slashCommand('unlock', 'kilit-aç', commands.unlock.description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((o) =>
      named(o, 'channel', 'kanal', commands.unlock.channel).addChannelTypes(...LOCKABLE_TYPES),
    )
    .addStringOption((o) => named(o, 'reason', 'sebep', commands.unlock.reason).setMaxLength(500))
    .toJSON(),
  async execute(interaction, ctx) {
    const channel = lockableChannel(
      interaction.options.getChannel('channel') ?? interaction.channel,
    );
    assertMemberPermissions(interaction, PermissionFlagsBits.ManageChannels);
    assertBotPermissions(
      interaction.guild,
      [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
      channel,
    );
    const lock = await getChannelLock(ctx.db, channel.id);
    if (!lock) throw new UserError(tr.moderation.errors.notLocked);

    const everyone = interaction.guild.roles.everyone;
    const reason = auditReason(interaction.user.tag, interaction.options.getString('reason'));
    const restored = Object.fromEntries(
      Object.entries(LOCKED).map(([name, bit]) => [
        name,
        previousState(lock.previousAllow, lock.previousDeny, bit),
      ]),
    );
    await channel.permissionOverwrites.edit(everyone, restored, { reason });

    // Without a previous overwrite, drop the now-empty one instead of leaving it behind.
    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);
    const empty = new PermissionsBitField();
    if (
      lock.previousAllow === null &&
      overwrite &&
      overwrite.allow.equals(empty) &&
      overwrite.deny.equals(empty)
    ) {
      await channel.permissionOverwrites.delete(everyone, reason).catch(() => undefined);
    }
    await deleteChannelLock(ctx.db, channel.id);

    await interaction.reply({ embeds: [successEmbed(commands.unlock.done(channel.toString()))] });
    if (channel.id !== interaction.channelId && channel.isTextBased()) {
      await channel.send({ content: commands.unlock.notice }).catch(() => undefined);
    }
  },
};
