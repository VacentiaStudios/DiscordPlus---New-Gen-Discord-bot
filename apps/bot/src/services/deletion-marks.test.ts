import { describe, expect, it } from 'vitest';
import { DeletionMarks } from './deletion-marks';

describe('DeletionMarks', () => {
  it('returns a mark once', () => {
    const marks = new DeletionMarks();
    marks.mark(['1', '2'], 'AutoMod: Spam');
    expect(marks.take('1')).toBe('AutoMod: Spam');
    expect(marks.take('1')).toBeUndefined();
    expect(marks.take('2')).toBe('AutoMod: Spam');
  });

  it('forgets marks after the TTL', () => {
    let now = 0;
    const marks = new DeletionMarks(1_000, () => now);
    marks.mark(['1'], 'x');
    now = 1_001;
    expect(marks.take('1')).toBeUndefined();
  });
});
