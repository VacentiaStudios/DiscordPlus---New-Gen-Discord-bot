import { DURATION, MAX_TIMEOUT_MS } from '@discordplus/shared';
import { describe, expect, it } from 'vitest';
import { durationSuggestions, parseDurationOption } from './durations';
import { UserError } from './errors';

describe('parseDurationOption', () => {
  it('returns milliseconds for valid input', () => {
    expect(parseDurationOption('2sa', { max: MAX_TIMEOUT_MS })).toBe(2 * DURATION.HOUR);
  });

  it.each([
    ['abc', /Geçersiz süre/],
    ['30sn', /en az 1 dakika/],
    ['29g', /en fazla 4 hafta/],
  ])('rejects %s', (input, message) => {
    expect(() => parseDurationOption(input, { max: MAX_TIMEOUT_MS })).toThrow(UserError);
    expect(() => parseDurationOption(input, { max: MAX_TIMEOUT_MS })).toThrow(message);
  });

  it('honours a custom minimum', () => {
    expect(parseDurationOption('5sn', { min: DURATION.SECOND, max: DURATION.HOUR })).toBe(5_000);
  });
});

describe('durationSuggestions', () => {
  it('offers presets within the limits when nothing is typed', () => {
    const values = durationSuggestions('', { max: DURATION.DAY }).map((s) => s.value);
    expect(values).toContain('5dk');
    expect(values).toContain('1g');
    expect(values).not.toContain('1hf');
  });

  it('puts the typed duration first', () => {
    expect(durationSuggestions('1g12sa', { max: MAX_TIMEOUT_MS })[0]).toEqual({
      name: '1 gün 12 saat',
      value: '1g12sa',
    });
  });

  it('filters presets by the typed text', () => {
    const names = durationSuggestions('saat', { max: MAX_TIMEOUT_MS }).map((s) => s.name);
    expect(names).toEqual(['1 saat', '6 saat']);
  });

  it('drops typed durations outside the limits', () => {
    expect(durationSuggestions('10hf', { max: MAX_TIMEOUT_MS })).toEqual([]);
  });
});
