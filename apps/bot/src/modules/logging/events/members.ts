import { setTimeout as sleep } from 'node:timers/promises';
import { Events } from 'discord.js';
import { defineEvent } from '../../../core/types';
import { sendLogMessage } from '../../../services/log-channel';
import { diffIds, profileChange } from '../diff';
import {
  memberJoinedEmbed,
  memberLeftEmbed,
  nicknameChangedEmbed,
  rolesChangedEmbed,
  userUpdatedEmbed,
} from '../embeds';
import { memberRoleIds, userRef } from '../snapshots';

/**
 * A profile change arrives once, followed by one member update per shared guild;
 * waiting briefly lets those updates put the member into each guild's cache.
 */
const PROFILE_FAN_OUT_DELAY_MS = 3_000;

export const memberAddEvent = defineEvent({
  event: Events.GuildMemberAdd,
  async handle(ctx, member) {
    await sendLogMessage(ctx, member.guild, 'member', {
      embeds: [
        memberJoinedEmbed(
          { ...userRef(member.user), createdAt: member.user.createdAt },
          member.guild.memberCount,
        ),
      ],
    });
  },
});

export const memberRemoveEvent = defineEvent({
  event: Events.GuildMemberRemove,
  async handle(ctx, member) {
    if (member.id === ctx.client.user?.id) return;
    await sendLogMessage(ctx, member.guild, 'member', {
      embeds: [memberLeftEmbed(userRef(member.user), member.joinedAt, memberRoleIds(member))],
    });
  },
});

export const memberUpdateEvent = defineEvent({
  event: Events.GuildMemberUpdate,
  async handle(ctx, before, after) {
    const beforeRoles = memberRoleIds(before);
    if (!beforeRoles) return;
    const user = userRef(after.user);
    const embeds = [];
    if (before.nickname !== after.nickname) {
      embeds.push(nicknameChangedEmbed(user, before.nickname, after.nickname));
    }
    const { added, removed } = diffIds(beforeRoles, memberRoleIds(after) ?? []);
    if (added.length || removed.length) embeds.push(rolesChangedEmbed(user, added, removed));
    if (embeds.length) await sendLogMessage(ctx, after.guild, 'member', { embeds });
  },
});

/** Username, display name and avatar changes, posted to every shared guild's member log. */
export function createUserUpdateEvent(fanOutDelayMs = PROFILE_FAN_OUT_DELAY_MS) {
  return defineEvent({
    event: Events.UserUpdate,
    async handle(ctx, before, after) {
      if (before.partial) return;
      const change = profileChange(before, after);
      if (!change) return;

      if (fanOutDelayMs > 0) await sleep(fanOutDelayMs);
      const embed = userUpdatedEmbed(userRef(after), change);
      for (const guild of ctx.client.guilds.cache.values()) {
        if (!guild.members.cache.has(after.id)) continue;
        await sendLogMessage(ctx, guild, 'member', { embeds: [embed] });
      }
    },
  });
}

export const userUpdateEvent = createUserUpdateEvent();
