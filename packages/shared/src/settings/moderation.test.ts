import { describe, expect, it } from 'vitest';
import { DURATION } from '../duration';
import { moderationSettingsSchema, thresholdFor, warnThresholdSchema } from './moderation';

describe('moderationSettingsSchema', () => {
  it('has safe defaults', () => {
    expect(moderationSettingsSchema.parse({})).toEqual({
      dmOnAction: true,
      warnExpiryDays: 0,
      thresholds: [],
    });
  });

  it('accepts a full configuration', () => {
    const value = {
      dmOnAction: false,
      warnExpiryDays: 30,
      thresholds: [
        { count: 3, action: 'timeout', durationMs: DURATION.HOUR },
        { count: 5, action: 'kick', durationMs: null },
        { count: 7, action: 'ban', durationMs: 7 * DURATION.DAY },
        { count: 9, action: 'ban', durationMs: null },
      ],
    };
    expect(moderationSettingsSchema.parse(value)).toEqual(value);
  });

  it('rejects duplicate threshold counts', () => {
    const result = moderationSettingsSchema.safeParse({
      thresholds: [
        { count: 3, action: 'kick' },
        { count: 3, action: 'ban' },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['thresholds', 1, 'count']);
  });
});

describe('warnThresholdSchema', () => {
  it('requires a duration for timeouts, at most 28 days', () => {
    expect(warnThresholdSchema.safeParse({ count: 1, action: 'timeout' }).success).toBe(false);
    expect(
      warnThresholdSchema.safeParse({ count: 1, action: 'timeout', durationMs: 29 * DURATION.DAY })
        .success,
    ).toBe(false);
    expect(
      warnThresholdSchema.safeParse({ count: 1, action: 'timeout', durationMs: DURATION.DAY })
        .success,
    ).toBe(true);
  });

  it('does not allow a duration for kicks', () => {
    expect(
      warnThresholdSchema.safeParse({ count: 1, action: 'kick', durationMs: DURATION.DAY }).success,
    ).toBe(false);
  });
});

describe('thresholdFor', () => {
  const thresholds = warnThresholdSchema.array().parse([
    { count: 3, action: 'timeout', durationMs: DURATION.HOUR },
    { count: 5, action: 'kick' },
  ]);

  it('matches the exact warning count only', () => {
    expect(thresholdFor(thresholds, 3)?.action).toBe('timeout');
    expect(thresholdFor(thresholds, 4)).toBeUndefined();
    expect(thresholdFor(thresholds, 5)?.action).toBe('kick');
    expect(thresholdFor(thresholds, 6)).toBeUndefined();
  });
});
