/** Looks up the guild an invite code belongs to; null when the invite does not exist. */
export type InviteLookup = (code: string) => Promise<string | null>;

interface CacheEntry {
  guildId: string | null;
  expiresAt: number;
}

/** Caches invite lookups, which Discord rate-limits. */
export class InviteResolver {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly lookup: InviteLookup,
    private readonly ttlMs = 60 * 60_000,
    private readonly maxEntries = 1_000,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * The guild id of `code`: null for unknown or expired invites, undefined when
   * Discord could not be asked (the caller should give the benefit of the doubt).
   */
  async guildIdOf(code: string): Promise<string | null | undefined> {
    const cached = this.cache.get(code);
    if (cached && cached.expiresAt > this.now()) return cached.guildId;
    let guildId: string | null;
    try {
      guildId = await this.lookup(code);
    } catch {
      return undefined;
    }
    if (this.cache.size >= this.maxEntries) this.prune();
    this.cache.set(code, { guildId, expiresAt: this.now() + this.ttlMs });
    return guildId;
  }

  private prune(): void {
    const now = this.now();
    for (const [code, entry] of this.cache) if (entry.expiresAt <= now) this.cache.delete(code);
    // Still full: drop the oldest lookups.
    for (const code of this.cache.keys()) {
      if (this.cache.size < this.maxEntries) break;
      this.cache.delete(code);
    }
  }
}
