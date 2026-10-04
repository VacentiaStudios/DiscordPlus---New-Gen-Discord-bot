import { Events } from 'discord.js';
import { defineEvent } from '../../../core/types';
import { tr } from '../../../locales/tr';
import { sendLogMessage } from '../../../services/log-channel';
import {
  channelChanges,
  overwriteChanges,
  permissionChanges,
  roleChanges,
  type FieldChange,
} from '../diff';
import {
  channelEventEmbed,
  channelUpdatedEmbed,
  guildUpdatedEmbed,
  roleEventEmbed,
  roleUpdatedEmbed,
} from '../embeds';
import { channelInfo, channelSnapshot, overwriteSnapshots, roleSnapshot } from '../snapshots';

export const channelCreateEvent = defineEvent({
  event: Events.ChannelCreate,
  async handle(ctx, channel) {
    await sendLogMessage(ctx, channel.guild, 'server', {
      embeds: [channelEventEmbed('created', channelInfo(channel))],
    });
  },
});

export const channelDeleteEvent = defineEvent({
  event: Events.ChannelDelete,
  async handle(ctx, channel) {
    if (channel.isDMBased()) return;
    await sendLogMessage(ctx, channel.guild, 'server', {
      embeds: [channelEventEmbed('deleted', channelInfo(channel))],
    });
  },
});

export const channelUpdateEvent = defineEvent({
  event: Events.ChannelUpdate,
  async handle(ctx, before, after) {
    if (before.isDMBased() || after.isDMBased()) return;
    // Reordering channels also fires updates; those produce no changes and are skipped.
    const changes = channelChanges(channelSnapshot(before), channelSnapshot(after));
    const overwrites = overwriteChanges(overwriteSnapshots(before), overwriteSnapshots(after));
    if (changes.length === 0 && overwrites.length === 0) return;
    await sendLogMessage(ctx, after.guild, 'server', {
      embeds: [channelUpdatedEmbed(after, changes, overwrites)],
    });
  },
});

export const roleCreateEvent = defineEvent({
  event: Events.GuildRoleCreate,
  async handle(ctx, role) {
    await sendLogMessage(ctx, role.guild, 'server', {
      embeds: [
        roleEventEmbed('created', {
          id: role.id,
          name: role.name,
          color: role.colors.primaryColor,
        }),
      ],
    });
  },
});

export const roleDeleteEvent = defineEvent({
  event: Events.GuildRoleDelete,
  async handle(ctx, role) {
    await sendLogMessage(ctx, role.guild, 'server', {
      embeds: [
        roleEventEmbed('deleted', {
          id: role.id,
          name: role.name,
          color: role.colors.primaryColor,
        }),
      ],
    });
  },
});

export const roleUpdateEvent = defineEvent({
  event: Events.GuildRoleUpdate,
  async handle(ctx, before, after) {
    const changes = roleChanges(roleSnapshot(before), roleSnapshot(after));
    const permissions = permissionChanges(before.permissions.bitfield, after.permissions.bitfield);
    // Reordering roles fires an update per moved role; skip those.
    if (changes.length === 0 && !permissions.added.length && !permissions.removed.length) return;
    await sendLogMessage(ctx, after.guild, 'server', {
      embeds: [
        roleUpdatedEmbed(
          { id: after.id, guildId: after.guild.id, color: after.colors.primaryColor },
          changes,
          permissions,
        ),
      ],
    });
  },
});

export const guildUpdateEvent = defineEvent({
  event: Events.GuildUpdate,
  async handle(ctx, before, after) {
    const changes: FieldChange[] =
      before.name === after.name
        ? []
        : [{ label: tr.logging.name, before: before.name, after: after.name }];
    const iconChanged = before.icon !== after.icon;
    if (changes.length === 0 && !iconChanged) return;
    await sendLogMessage(ctx, after, 'server', {
      embeds: [guildUpdatedEmbed(changes, after.iconURL(), iconChanged)],
    });
  },
});
