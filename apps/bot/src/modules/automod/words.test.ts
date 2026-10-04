import { describe, expect, it } from 'vitest';
import { duplicateKey, normalizeTokens, normalizeWord } from './normalize';
import { ProfanityMatcher, WordList } from './words';

const defaults = new ProfanityMatcher({ useDefaultList: true, words: [], allowed: [] });

describe('normalizeTokens', () => {
  it('lowercases the Turkish way and keeps Turkish letters', () => {
    expect(normalizeTokens('İSTANBUL ışık ŞIK')).toEqual(['istanbul', 'ışık', 'şık', 'şik']);
  });

  it('also reads a capital I as i, as typed on English keyboards', () => {
    expect(normalizeTokens('SIK')).toEqual(['sık', 'sik']);
  });

  it('undoes common evasions', () => {
    expect(normalizeTokens('s1kt1r')).toEqual(['siktir']);
    expect(normalizeTokens('siiiiiktir')).toEqual(['siktir']);
    expect(normalizeTokens('s i k t i r')).toEqual(['siktir']);
    expect(normalizeTokens('a.m.k')).toEqual(['amk']);
    expect(normalizeTokens('s\u200Bi\u200Dk')).toEqual(['sik']);
    expect(normalizeTokens('ｓｉｋ')).toEqual(['sik']);
    expect(normalizeTokens('ѕiktir')).toEqual(['siktir']);
    expect(normalizeTokens('sìktír')).toEqual(['siktir']);
  });

  it('ignores mentions, emoji, links and edge punctuation', () => {
    expect(normalizeTokens('<@123> <:sik:456> https://sik.example amk!')).toEqual(['amk']);
  });

  it('normalises list words like messages', () => {
    expect(normalizeWord('Yarrak')).toBe('yarak');
  });
});

describe('ProfanityMatcher with the default list', () => {
  it.each([
    'siktir git',
    'S1KT1R',
    'SIKTIR',
    'amk',
    'AMK ya',
    'a q',
    'orospu çocuğu',
    'yarrrak',
    'piç kurusu',
    'götveren',
    'şerefsiz herif',
    'serefsiz',
    'ananı s.i.k.e.y.i.m',
    'amına koyayım',
    'sıçayım',
  ])('catches %j', (text) => {
    expect(defaults.find(text)).not.toBeNull();
  });

  it.each([
    'bugün çok sıkıntılıyım',
    'ama ben gelmek istiyorum',
    'amacım bu değil',
    'amcam geldi',
    'amin',
    'sıkıcı bir gün',
    'sık sık gelirim',
    'çok şık olmuş',
    'çantayı götürdü',
    'boks maçı',
    'sıçan gördüm',
    'sıçradı',
    'ağır siklet',
    'siklon geliyor',
    'sikinti yok',
    'sikildim valla',
    'SIKINTI YOK',
    'got it, thanks',
    'I am here',
    'piknik yapalım',
    'masa, kitap, kalem',
    'ambulans çağırın',
    'o ve ben',
  ])('leaves %j alone', (text) => {
    expect(defaults.find(text)).toBeNull();
  });

  it('reports the offending word', () => {
    expect(defaults.find('hadi lan s1kt1r')).toBe('siktir');
  });
});

describe('custom lists', () => {
  it('adds server words and exceptions', () => {
    const matcher = new ProfanityMatcher({
      useDefaultList: true,
      words: ['salak', 'aptal*'],
      allowed: ['amk'],
    });
    expect(matcher.find('salak')).toBe('salak');
    expect(matcher.find('salaklık')).toBeNull();
    // Reported in normalised form.
    expect(matcher.find('aptallık')).toBe('aptalık');
    expect(matcher.find('amk')).toBeNull();
  });

  it('can run without the default list', () => {
    const matcher = new ProfanityMatcher({ useDefaultList: false, words: ['kötü'], allowed: [] });
    expect(matcher.find('siktir')).toBeNull();
    expect(matcher.find('çok kötü')).toBe('kötü');
  });

  it('ignores entries that normalise to a single letter', () => {
    expect(new WordList(['aa*', '!!']).size).toBe(0);
  });
});

describe('duplicateKey', () => {
  it('ignores case, spacing and invisible characters', () => {
    expect(duplicateKey('  MERHABA   Dünya\u200B ')).toBe(duplicateKey('merhaba dünya'));
  });
});
