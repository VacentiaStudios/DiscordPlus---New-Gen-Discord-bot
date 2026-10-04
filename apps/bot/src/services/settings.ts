import type { GuildSettings, SectionSettings, SettingsSection } from '@discordplus/shared';

export type SettingsLoader = (guildId: string) => Promise<GuildSettings>;

interface CacheEntry {
  promise: Promise<GuildSettings>;
  expiresAt: number;
}

/**
 * Per-guild settings cache. Entries are dropped when the web panel announces a
 * change (see the panel module) and expire after `ttlMs` as a safety net in
 * case a notification was missed.
 */
export class GuildSettingsService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly load: SettingsLoader,
    private readonly ttlMs = 5 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  get(guildId: string): Promise<GuildSettings> {
    const cached = this.cache.get(guildId);
    if (cached && cached.expiresAt > this.now()) return cached.promise;

    // Concurrent callers share one in-flight load.
    const promise = this.load(guildId);
    this.cache.set(guildId, { promise, expiresAt: this.now() + this.ttlMs });
    promise.catch(() => {
      if (this.cache.get(guildId)?.promise === promise) this.cache.delete(guildId);
    });
    return promise;
  }

  async section<S extends SettingsSection>(
    guildId: string,
    section: S,
  ): Promise<SectionSettings<S>> {
    const settings = await this.get(guildId);
    return settings[section];
  }

  invalidate(guildId: string): void {
    this.cache.delete(guildId);
  }

  clear(): void {
    this.cache.clear();
  }
}
