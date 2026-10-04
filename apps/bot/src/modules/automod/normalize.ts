// Text normalisation for word filters. Turkish-aware: "I" lowercases to "ı",
// and ı/i, ç/c, ğ/g, ö/o, ş/s, ü/u stay distinct ("sık" is not "sik").

/** Discord markup (mentions, channels, custom emoji, timestamps, commands) and links. */
const MARKUP = /<(?:@[!&]?\d+|#\d+|a?:\w+:\d+|t:-?\d+(?::\w)?|\/[^>]+:\d+)>|https?:\/\/\S+/gu;
/** Characters that render as nothing (zero-width spaces, joiners, soft hyphens, fillers…). */
const INVISIBLE = /\p{Default_Ignorable_Code_Point}/gu;
const TURKISH_LETTERS = new Set(['ç', 'ğ', 'ı', 'ö', 'ş', 'ü']);

/** Cyrillic and Greek look-alikes of Latin letters (lowercase). */
const CONFUSABLES: Record<string, string> = {
  а: 'a',
  е: 'e',
  ё: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
  к: 'k',
  ѕ: 's',
  і: 'i',
  ј: 'j',
  ԁ: 'd',
  ɡ: 'g',
  α: 'a',
  ε: 'e',
  ι: 'i',
  κ: 'k',
  ν: 'v',
  ο: 'o',
  ρ: 'p',
  τ: 't',
  υ: 'u',
  χ: 'x',
};

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '€': 'e',
  '!': 'i',
  '|': 'i',
};

const TOKEN = /[\p{L}\p{N}@$€!|]+/gu;

/** Removes invisible characters and folds compatibility forms (ｓ → s, 𝐬 → s). */
export function stripInvisible(text: string): string {
  return text.normalize('NFKC').replace(INVISIBLE, '');
}

/** Lowercase Latin skeleton: Turkish letters kept, other accents and look-alikes folded. */
function fold(lowercase: string): string {
  let out = '';
  for (const char of lowercase) {
    const plain = TURKISH_LETTERS.has(char) ? char : char.normalize('NFD').replace(/\p{M}+/gu, '');
    out += CONFUSABLES[plain] ?? plain;
  }
  return out;
}

/** "siiiik" → "sik"; list words get the same treatment, so "yarrak" → "yarak". */
function collapseRepeats(text: string): string {
  return text.replace(/(.)\1+/gu, '$1');
}

function normalizeToken(token: string): string {
  // "!" and "|" at the edges are punctuation, inside a word they stand for "i".
  const trimmed = token.replace(/^[!|]+|[!|]+$/gu, '');
  let out = '';
  for (const char of trimmed) out += LEET[char] ?? char;
  return collapseRepeats(out);
}

function tokensOf(lowercase: string): string[] {
  const tokens = (fold(lowercase).match(TOKEN) ?? []).map(normalizeToken).filter(Boolean);
  // Letters spaced out to dodge filters ("s i k", "a.m.k") are joined back.
  const merged: string[] = [];
  let run = '';
  for (const token of tokens) {
    if ([...token].length === 1) {
      run += token;
      continue;
    }
    if (run) merged.push(collapseRepeats(run));
    run = '';
    merged.push(token);
  }
  if (run) merged.push(collapseRepeats(run));
  return merged;
}

/**
 * Normalised words of a message. Text with a capital "I" is read both the
 * Turkish way (I → ı) and the English-keyboard way (I → i), since "SIKTIR"
 * usually means "siktir".
 */
export function normalizeTokens(text: string): string[] {
  const plain = stripInvisible(text.replace(MARKUP, ' '));
  const tokens = tokensOf(plain.toLocaleLowerCase('tr'));
  if (!plain.includes('I')) return tokens;
  const alternative = tokensOf(plain.replaceAll('I', 'i').toLocaleLowerCase('tr'));
  return [...new Set([...tokens, ...alternative])];
}

/** A single list word in the same normalised form as message tokens. */
export function normalizeWord(word: string): string {
  return tokensOf(stripInvisible(word).toLocaleLowerCase('tr')).join('');
}

/** Key under which repeated messages are compared: case, spacing and invisible characters ignored. */
export function duplicateKey(text: string): string {
  return stripInvisible(text).toLocaleLowerCase('tr').replace(/\s+/gu, ' ').trim().slice(0, 500);
}

/** Text without Discord markup and links, for checks that look at the visible words. */
export function visibleText(text: string): string {
  return stripInvisible(text.replace(MARKUP, ' '));
}
