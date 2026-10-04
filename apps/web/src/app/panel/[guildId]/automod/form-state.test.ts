import { automodSettingsSchema, DURATION, recommendedAutomodSettings } from '@discordplus/shared';
import { describe, expect, it } from 'vitest';
import { listIssue, parseList, toFormState, toSettings } from './form-state';

describe('AutoMod form state', () => {
  it('round-trips settings', () => {
    const settings = recommendedAutomodSettings(
      automodSettingsSchema.parse({ profanity: { words: ['kötü*'], allowedWords: ['iyi'] } }),
    );
    const state = toFormState(settings);
    expect(state.spam.duration).toBe('10dk');
    expect(state.profanity.words).toBe('kötü*');
    expect(toSettings(state)).toEqual({ value: settings, issues: {} });
  });

  it('reports durations it cannot read and ignores them where unused', () => {
    const state = toFormState(automodSettingsSchema.parse({}));
    state.spam = { ...state.spam, action: 'timeout', duration: 'yarın' };
    state.caps = { ...state.caps, action: 'kick', duration: '1sa' };
    const { value, issues } = toSettings(state);
    expect(issues).toEqual({ 'spam.durationMs': 'Geçersiz süre (ör. 30dk, 2sa, 1g)' });
    expect(value.caps.durationMs).toBeNull();

    state.spam.duration = '1g12sa';
    expect(toSettings(state).value.spam.durationMs).toBe(DURATION.DAY + 12 * DURATION.HOUR);
  });

  it('turns empty numbers into schema errors', () => {
    const state = toFormState(automodSettingsSchema.parse({}));
    state.mentions.maxMentions = '';
    const result = automodSettingsSchema.safeParse(toSettings(state).value);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['mentions', 'maxMentions'],
      message: 'Bir sayı girin',
    });
  });
});

describe('parseList', () => {
  it('splits, trims and de-duplicates', () => {
    expect(parseList(' kötü \n\nçirkin, KÖTÜ\nİyi')).toEqual(['kötü', 'çirkin', 'İyi']);
    expect(parseList('YouTube.com\nyoutube.com', { lowercase: true })).toEqual(['youtube.com']);
  });
});

describe('listIssue', () => {
  it('names the entry with the problem', () => {
    expect(
      listIssue({ 'profanity.words.1': 'Boşluk içeremez' }, 'profanity.words', ['a', 'b c']),
    ).toBe('“b c”: Boşluk içeremez');
    expect(listIssue({ 'links.domains': 'Çok fazla' }, 'links.domains', [])).toBe('Çok fazla');
    expect(listIssue({}, 'links.domains', [])).toBeUndefined();
  });
});
