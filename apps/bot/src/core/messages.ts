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
