import { describe, expect, it } from 'vitest';
import { diffSettings } from './diff';

describe('diffSettings', () => {
  it('reports nothing for equal documents', () => {
    expect(diffSettings({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toEqual([]);
  });

  it('reports changed leaves with dotted paths', () => {
    expect(
      diffSettings(
        { dmOnAction: true, channels: { moderation: null, message: '1' } },
        { dmOnAction: false, channels: { moderation: '2', message: '1' } },
      ),
    ).toEqual([
      { path: 'channels.moderation', before: null, after: '2' },
      { path: 'dmOnAction', before: true, after: false },
    ]);
  });

  it('treats arrays as a whole', () => {
    expect(diffSettings({ ids: ['1', '2'] }, { ids: ['2', '1'] })).toEqual([
      { path: 'ids', before: ['1', '2'], after: ['2', '1'] },
    ]);
  });

  it('reports added and removed keys', () => {
    expect(diffSettings({ a: 1 }, { b: 2 })).toEqual([
      { path: 'a', before: 1, after: undefined },
      { path: 'b', before: undefined, after: 2 },
    ]);
  });
});
