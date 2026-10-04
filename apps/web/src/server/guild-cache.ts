/**
 * Small TTL cache with in-flight de-duplication, used for per-user guild lists
 * (Discord rate-limits `/users/@me/guilds` tightly).
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; storedAt: number }>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1_000,
    private readonly now: () => number = Date.now,
  ) {}

  /** Age of the cached value in milliseconds, or undefined when nothing is cached. */
  age(key: string): number | undefined {
    const entry = this.entries.get(key);
    return entry ? this.now() - entry.storedAt : undefined;
  }

  peek(key: string): T | undefined {
    return this.entries.get(key)?.value;
  }

  async get(key: string, load: () => Promise<T>, options: { force?: boolean } = {}): Promise<T> {
    const entry = this.entries.get(key);
    if (!options.force && entry && this.now() - entry.storedAt < this.ttlMs) return entry.value;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  set(key: string, value: T): void {
    if (this.entries.size >= this.maxEntries) this.evictExpired();
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: this.now() });
    // Still full: drop the oldest insertion.
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  private evictExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.storedAt >= this.ttlMs) this.entries.delete(key);
    }
  }
}
