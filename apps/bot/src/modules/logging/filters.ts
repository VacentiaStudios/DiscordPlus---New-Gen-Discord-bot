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

/** Uncached edits older than this are pin or link-preview updates of a past edit. */
const RECENT_EDIT_MS = 60_000;

/**
 * Whether a message update changed its text. Discord also sends updates for pins
 * and link previews; with the old message cached the content tells them apart,
 * otherwise only a fresh `editedTimestamp` marks a real edit.
 */
export function isContentEdit(
  before: { partial: boolean; content: string | null },
  after: { content: string | null; editedTimestamp: number | null },
  now = Date.now(),
): boolean {
  if (typeof after.content !== 'string') return false;
  if (!before.partial) return before.content !== after.content;
  return after.editedTimestamp !== null && now - after.editedTimestamp < RECENT_EDIT_MS;
}
