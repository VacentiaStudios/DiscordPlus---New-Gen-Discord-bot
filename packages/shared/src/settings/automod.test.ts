import { describe, expect, it } from 'vitest';
import { DURATION } from '../duration';
import {
  automodSettingsSchema,
  DEFAULT_ALLOWED_DOMAINS,
  recommendedAutomodSettings,
} from './automod';

describe('automodSettingsSchema', () => {
  it('starts with every filter off', () => {
    const settings = automodSettingsSchema.parse({});
    expect(
      [
        settings.spam,
        settings.duplicates,
        settings.profanity,
        settings.invites,
        settings.links,
        settings.caps,
        settings.mentions,
      ].every((filter) => !filter.enabled),
    ).toBe(true);
    expect(settings.spam).toMatchObject({ action: 'delete', maxMessages: 5, perSeconds: 5 });
    expect(settings.links.domains).toEqual(DEFAULT_ALLOWED_DOMAINS);
    expect(settings.exemptModerators).toBe(true);
  });

  it('requires a duration for timeouts and rejects one for other actions', () => {
    const issues = (value: unknown) =>
      automodSettingsSchema
        .safeParse(value)
        .error?.issues.map((i) => [i.path.join('.'), i.message]);

    expect(issues({ spam: { action: 'timeout' } })).toEqual([
      ['spam.durationMs', 'Susturma için süre gerekli'],
    ]);
    expect(issues({ caps: { action: 'timeout', durationMs: 30 * DURATION.DAY } })).toEqual([
      ['caps.durationMs', 'Susturma en fazla 28 gün olabilir'],
    ]);
    expect(issues({ caps: { action: 'kick', durationMs: DURATION.HOUR } })).toEqual([
      ['caps.durationMs', 'Bu eylem için süre kullanılmaz'],
    ]);
    expect(
      automodSettingsSchema.safeParse({ caps: { action: 'ban', durationMs: null } }).success,
    ).toBe(true);
  });

  it('validates words and domains', () => {
    expect(
      automodSettingsSchema.safeParse({ profanity: { words: ['kötü*', ' çirkin '] } }).data
        ?.profanity.words,
    ).toEqual(['kötü*', 'çirkin']);
    expect(automodSettingsSchema.safeParse({ profanity: { words: ['iki kelime'] } }).success).toBe(
      false,
    );
    expect(automodSettingsSchema.safeParse({ profanity: { words: ['*kök'] } }).success).toBe(false);
    expect(
      automodSettingsSchema.safeParse({ links: { domains: ['YouTube.com'] } }).data?.links.domains,
    ).toEqual(['youtube.com']);
    expect(automodSettingsSchema.safeParse({ links: { domains: ['https://x.com'] } }).success).toBe(
      false,
    );
  });
});

describe('recommendedAutomodSettings', () => {
  it('turns on everything but links and keeps lists and exemptions', () => {
    const current = automodSettingsSchema.parse({
      profanity: { words: ['özel'] },
      exemptRoleIds: ['123456789012345678'],
    });
    const recommended = recommendedAutomodSettings(current);
    expect(automodSettingsSchema.parse(recommended)).toEqual(recommended);
    expect(recommended.links.enabled).toBe(false);
    expect(recommended.spam).toMatchObject({ enabled: true, action: 'timeout' });
    expect(recommended.profanity.words).toEqual(['özel']);
    expect(recommended.exemptRoleIds).toEqual(['123456789012345678']);
  });
});
