/**
 * Remembers, for a short while, why the bot deleted certain messages (AutoMod,
 * `/temizle`), so the message log can say so instead of reporting a plain delete.
 */
export class DeletionMarks {
  private readonly marks = new Map<string, { label: string; expiresAt: number }>();

  constructor(
    private readonly ttlMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  mark(messageIds: Iterable<string>, label: string): void {
    const expiresAt = this.now() + this.ttlMs;
    for (const id of messageIds) this.marks.set(id, { label, expiresAt });
    this.prune();
  }

  /** The label for a deleted message, consumed on read. */
  take(messageId: string): string | undefined {
    const mark = this.marks.get(messageId);
    if (!mark) return undefined;
    this.marks.delete(messageId);
    return mark.expiresAt > this.now() ? mark.label : undefined;
  }

  private prune(): void {
    if (this.marks.size < 1_000) return;
    const now = this.now();
    for (const [id, mark] of this.marks) if (mark.expiresAt <= now) this.marks.delete(id);
  }
}
