import { normalizeTokens, normalizeWord } from './normalize';

/**
 * Default Turkish profanity list. Entries are normalised like messages, so
 * leetspeak, repeated letters and look-alike characters are covered. A
 * trailing `*` matches every word starting with the entry.
 *
 * Kept conservative: words that are also common clean words (e.g. "am", "got")
 * are left out, and the exceptions below cover clean words sharing a prefix.
 */
export const DEFAULT_PROFANITY = [
  'sik*',
  'hassiktir*',
  'sktr*',
  'skym',
  'skiym',
  'skrm',
  'skerim',
  'amk*',
  'amq',
  'aq',
  'mk',
  'amın*',
  'aminako*',
  'mına',
  'mınako*',
  'amcık*',
  'amcik*',
  'orospu*',
  'orosbu*',
  'oruspu*',
  'orspu*',
  'oç',
  'piç*',
  'yarak*',
  'yarağ*',
  'dalyarak*',
  'göt*',
  'ibne*',
  'kahpe*',
  'pezevenk*',
  'pezo',
  'gavat*',
  'kavat*',
  'yavşak*',
  'yavsak*',
  'şerefsiz*',
  'serefsiz*',
  'puşt*',
  'taşak*',
  'tasak*',
  'sürtük*',
  'surtuk*',
  'kaltak*',
  'fahişe*',
  'fahise*',
  'kancık*',
  'kancik*',
  'bok*',
  'sıç*',
];

/** Clean words caught by a prefix above, including common spellings without Turkish letters. */
export const DEFAULT_EXCEPTIONS = [
  'siklet*',
  'siklon*',
  'siklamen*',
  'siklik*',
  'siklotron*',
  'sikh*',
  // "sıkıntı", "sıkıcı", "sıkıldım" typed without Turkish letters.
  'sikinti*',
  'sikici*',
  'sikil*',
  'götür*',
  'boks*',
  'bokeh*',
  'sıçan*',
  'sıçra*',
];

interface WordEntry {
  word: string;
  prefix: boolean;
}

function parseEntry(raw: string): WordEntry | null {
  const prefix = raw.endsWith('*');
  const word = normalizeWord(prefix ? raw.slice(0, -1) : raw);
  // Single letters would match far too much.
  return [...word].length >= 2 ? { word, prefix } : null;
}

export class WordList {
  private readonly exact = new Set<string>();
  private readonly prefixes: string[] = [];

  constructor(entries: Iterable<string>) {
    for (const raw of entries) {
      const entry = parseEntry(raw);
      if (!entry) continue;
      if (entry.prefix) this.prefixes.push(entry.word);
      else this.exact.add(entry.word);
    }
  }

  get size(): number {
    return this.exact.size + this.prefixes.length;
  }

  has(token: string): boolean {
    return this.exact.has(token) || this.prefixes.some((prefix) => token.startsWith(prefix));
  }
}

/** Finds blocked words in messages; exceptions win over both lists. */
export class ProfanityMatcher {
  private readonly blocked: WordList;
  private readonly allowed: WordList;

  constructor(options: {
    useDefaultList: boolean;
    words: readonly string[];
    allowed: readonly string[];
  }) {
    this.blocked = new WordList(
      options.useDefaultList ? [...DEFAULT_PROFANITY, ...options.words] : options.words,
    );
    this.allowed = new WordList(
      options.useDefaultList ? [...DEFAULT_EXCEPTIONS, ...options.allowed] : options.allowed,
    );
  }

  /** The first offending word (normalised), or null. */
  find(text: string): string | null {
    if (this.blocked.size === 0) return null;
    for (const token of normalizeTokens(text)) {
      if (!this.allowed.has(token) && this.blocked.has(token)) return token;
    }
    return null;
  }
}
