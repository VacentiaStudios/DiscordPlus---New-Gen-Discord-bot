import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirects';

describe('safeRedirectPath', () => {
  it.each([
    ['/panel', '/panel'],
    ['/panel/123?sekme=loglar', '/panel/123?sekme=loglar'],
    ['/panel/../gizlilik', '/gizlilik'],
  ])('keeps local path %s', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    42,
    '',
    'panel',
    'https://evil.example/panel',
    '//evil.example/panel',
    '/\\evil.example',
    'javascript:alert(1)',
  ])('falls back for %j', (input) => {
    expect(safeRedirectPath(input)).toBe('/panel');
  });
});
