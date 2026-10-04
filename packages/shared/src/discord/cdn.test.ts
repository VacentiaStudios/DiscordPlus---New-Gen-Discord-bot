import { describe, expect, it } from 'vitest';
import { guildIconUrl, guildInitials } from './cdn';

describe('guildIconUrl', () => {
  it('returns null without an icon', () => {
    expect(guildIconUrl('1', null)).toBeNull();
  });

  it('uses gif for animated icons', () => {
    expect(guildIconUrl('1', 'a_abc', 64)).toBe(
      'https://cdn.discordapp.com/icons/1/a_abc.gif?size=64',
    );
    expect(guildIconUrl('1', 'abc')).toBe('https://cdn.discordapp.com/icons/1/abc.webp?size=128');
  });
});

describe('guildInitials', () => {
  it.each([
    ['Vacentia Studios', 'VS'],
    ['  Çay   Ocağı ', 'ÇO'],
    ['tek', 't'],
    ['A B C D', 'ABC'],
    ['🎮 Oyun', '🎮O'],
  ])('%s → %s', (name, expected) => {
    expect(guildInitials(name)).toBe(expected);
  });
});
