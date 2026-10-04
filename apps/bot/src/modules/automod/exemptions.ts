import type { AutomodSettings } from '@discordplus/shared';

/** Whether AutoMod leaves a message alone because of who wrote it or where. */
export function isExempt(
  settings: Pick<AutomodSettings, 'exemptModerators' | 'exemptRoleIds' | 'exemptChannelIds'>,
  input: {
    /** The channel, its parent and grandparent. */
    channelIds: readonly (string | null)[];
    roleIds: readonly string[];
    /** Manage Messages in the channel (administrators included). */
    canManageMessages: boolean;
  },
): boolean {
  if (input.channelIds.some((id) => id !== null && settings.exemptChannelIds.includes(id))) {
    return true;
  }
  if (input.roleIds.some((id) => settings.exemptRoleIds.includes(id))) return true;
  return settings.exemptModerators && input.canManageMessages;
}
