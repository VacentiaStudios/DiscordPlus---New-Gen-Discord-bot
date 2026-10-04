import { describe, expect, it } from 'vitest';
import { DURATION, formatDuration, formatDurationInput, parseDuration } from './duration';

const { SECOND, MINUTE, HOUR, DAY, WEEK } = DURATION;

describe('parseDuration', () => {
  it.each([
    ['30sn', 30 * SECOND],
    ['10dk', 10 * MINUTE],
    ['2sa', 2 * HOUR],
    ['1g', DAY],
    ['1hf', WEEK],
    ['1g12sa', DAY + 12 * HOUR],
    ['1 gün 12 saat', DAY + 12 * HOUR],
    ['  5 DAKİKA ', 5 * MINUTE],
    ['5 DAKIKA', 5 * MINUTE],
    ['90saniye', 90 * SECOND],
    ['2hafta3gun', 2 * WEEK + 3 * DAY],
    ['1sa30dk', HOUR + 30 * MINUTE],
  ])('parses %s', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it.each(['', '   ', '30', 'dk', '10 dakikalar', '1x', '-5dk', '0dk', '1g abc', '1.5sa'])(
    'rejects %j',
    (input) => {
      expect(parseDuration(input)).toBeNull();
    },
  );

  it('does not read "saniye" as "sa"', () => {
    expect(parseDuration('5saniye')).toBe(5 * SECOND);
  });
});

describe('formatDuration', () => {
  it.each([
    [500, '0 saniye'],
    [30 * SECOND, '30 saniye'],
    [10 * MINUTE, '10 dakika'],
    [DAY + 12 * HOUR, '1 gün 12 saat'],
    [WEEK + DAY + HOUR, '1 hafta 1 gün'],
    [2 * HOUR + 5 * MINUTE + 3 * SECOND, '2 saat 5 dakika'],
  ])('formats %d', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('respects maxParts', () => {
    expect(formatDuration(WEEK + DAY + HOUR, 3)).toBe('1 hafta 1 gün 1 saat');
  });
});

describe('formatDurationInput', () => {
  it('round-trips through parseDuration', () => {
    for (const ms of [30 * SECOND, 10 * MINUTE, DAY + 12 * HOUR, 2 * WEEK + 3 * DAY + 5 * MINUTE]) {
      expect(parseDuration(formatDurationInput(ms))).toBe(ms);
    }
  });
});
