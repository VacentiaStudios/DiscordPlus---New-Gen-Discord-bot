import { defaultGuildSettings, type GuildSettings } from '@discordplus/shared';
import { describe, expect, it, vi } from 'vitest';
import { GuildSettingsService } from './settings';

function setup(ttlMs = 1_000) {
  let now = 0;
  const load = vi.fn((_guildId: string) => Promise.resolve<GuildSettings>(defaultGuildSettings()));
  const service = new GuildSettingsService(load, ttlMs, () => now);
  return { service, load, advance: (ms: number) => (now += ms) };
}

describe('GuildSettingsService', () => {
  it('caches settings per guild', async () => {
    const { service, load } = setup();
    await service.get('1');
    await service.get('1');
    await service.get('2');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const { service, load } = setup();
    await Promise.all([service.get('1'), service.get('1'), service.get('1')]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads after invalidate and clear', async () => {
    const { service, load } = setup();
    await service.get('1');
    service.invalidate('1');
    await service.get('1');
    service.clear();
    await service.get('1');
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('expires entries after the TTL', async () => {
    const { service, load, advance } = setup(1_000);
    await service.get('1');
    advance(999);
    await service.get('1');
    advance(2);
    await service.get('1');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed loads', async () => {
    const { service, load } = setup();
    load.mockRejectedValueOnce(new Error('db down'));
    await expect(service.get('1')).rejects.toThrow('db down');
    await expect(service.get('1')).resolves.toEqual(defaultGuildSettings());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('returns a single section', async () => {
    const { service } = setup();
    await expect(service.section('1', 'logging')).resolves.toEqual(defaultGuildSettings().logging);
  });
});
