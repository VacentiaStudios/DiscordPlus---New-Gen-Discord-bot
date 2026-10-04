import type { LoggingSettings } from '@discordplus/shared';

/** Channels configured as log targets; events inside them are never logged (no loops). */
export function logTargetIds(logging: LoggingSettings): Set<string> {
  return new Set(Object.values(logging.channels).filter((id): id is string => id !== null));
}

/**
 * Whether activity in a channel should be skipped: the channel itself, its parent
 * (category or thread parent) or grandparent is ignored, or it is a log channel.
 */
export function isIgnoredChannel(
  logging: LoggingSettings,
  channelIds: readonly (string | null | undefined)[],
): boolean {
  const ids = channelIds.filter((id): id is string => Boolean(id));
  if (ids.length === 0) return false;
  const targets = logTargetIds(logging);
  if (targets.has(ids[0]!)) return true;
  return ids.some((id) => logging.ignoredChannelIds.includes(id));
}
