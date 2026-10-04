import { describe, expect, it } from 'vitest';
import { loggingSettingsSchema } from './logging';

describe('loggingSettingsSchema', () => {
  it('fills nested defaults', () => {
    expect(loggingSettingsSchema.parse({})).toEqual({
      channels: { moderation: null, message: null, member: null, server: null, voice: null },
      ignoredChannelIds: [],
      ignoreBots: true,
    });
  });

  it('keeps configured channels and fills the rest', () => {
    const parsed = loggingSettingsSchema.parse({ channels: { moderation: '123456789012345678' } });
    expect(parsed.channels.moderation).toBe('123456789012345678');
    expect(parsed.channels.message).toBeNull();
  });

  it('rejects malformed channel ids', () => {
    expect(loggingSettingsSchema.safeParse({ channels: { moderation: 'abc' } }).success).toBe(
      false,
    );
  });
});
