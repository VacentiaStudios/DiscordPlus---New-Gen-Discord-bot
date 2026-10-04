import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from './guild-cache';

function setup(ttlMs = 1_000, maxEntries = 10) {
  let now = 0;
  const cache = new TtlCache<string>(ttlMs, maxEntries, () => now);
  return { cache, advance: (ms: number) => (now += ms) };
}

describe('TtlCache', () => {
  it('caches values until the TTL passes', async () => {
    const { cache, advance } = setup();
    const load = vi.fn(() => Promise.resolve('v'));
    await cache.get('a', load);
    advance(999);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(1);
    advance(1);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares in-flight loads', async () => {
    const { cache } = setup();
    const load = vi.fn(() => Promise.resolve('v'));
    await Promise.all([cache.get('a', load), cache.get('a', load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads when forced', async () => {
    const { cache } = setup();
    const load = vi.fn(() => Promise.resolve('v'));
    await cache.get('a', load);
    await cache.get('a', load, { force: true });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps the old value when a reload fails', async () => {
    const { cache, advance } = setup();
    await cache.get('a', () => Promise.resolve('old'));
    advance(5_000);
    await expect(cache.get('a', () => Promise.reject(new Error('rate limited')))).rejects.toThrow();
    expect(cache.peek('a')).toBe('old');
  });

  it('reports the age of entries', async () => {
    const { cache, advance } = setup();
    expect(cache.age('a')).toBeUndefined();
    await cache.get('a', () => Promise.resolve('v'));
    advance(250);
    expect(cache.age('a')).toBe(250);
  });

  it('never grows beyond maxEntries', async () => {
    const { cache } = setup(1_000_000, 3);
    for (const key of ['a', 'b', 'c', 'd', 'e']) await cache.get(key, () => Promise.resolve(key));
    expect(['a', 'b', 'c', 'd', 'e'].filter((key) => cache.peek(key) !== undefined)).toEqual([
      'c',
      'd',
      'e',
    ]);
  });
});
