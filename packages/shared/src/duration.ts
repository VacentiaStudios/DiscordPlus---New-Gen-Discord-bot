const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export const DURATION = { SECOND, MINUTE, HOUR, DAY, WEEK } as const;

/** Discord's hard limit for member timeouts. */
export const MAX_TIMEOUT_MS = 28 * DAY;

const UNIT_MS: Record<string, number> = {
  saniye: SECOND,
  sn: SECOND,
  dakika: MINUTE,
  dk: MINUTE,
  saat: HOUR,
  sa: HOUR,
  gün: DAY,
  gun: DAY,
  g: DAY,
  hafta: WEEK,
  hf: WEEK,
};

// Longer aliases first so that e.g. "saniye" is not consumed as "sa".
const TOKEN = /\s*(\d{1,6})\s*(saniye|sn|dakika|dk|saat|sa|gün|gun|g|hafta|hf)\s*/uy;

/**
 * Parses Turkish duration strings such as `30sn`, `10dk`, `2sa`, `1g`, `1hf`,
 * `1g12sa` or `1 gün 12 saat`. Returns milliseconds, or `null` when the input
 * is not a valid duration.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  // Turkish casing first ("DAKİKA" → "dakika"), then plain casing ("DAKIKA" typed on
  // a non-Turkish keyboard would otherwise become "dakıka").
  return parseLowercased(trimmed.toLocaleLowerCase('tr')) ?? parseLowercased(trimmed.toLowerCase());
}

function parseLowercased(text: string): number | null {
  if (text.length === 0) return null;

  let total = 0;
  let index = 0;
  TOKEN.lastIndex = 0;
  while (index < text.length) {
    TOKEN.lastIndex = index;
    const match = TOKEN.exec(text);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = UNIT_MS[match[2]!];
    if (unit === undefined) return null;
    total += amount * unit;
    index = TOKEN.lastIndex;
  }
  return total > 0 ? total : null;
}

const FORMAT_UNITS: [ms: number, label: string][] = [
  [WEEK, 'hafta'],
  [DAY, 'gün'],
  [HOUR, 'saat'],
  [MINUTE, 'dakika'],
  [SECOND, 'saniye'],
];

/** Formats milliseconds as readable Turkish text, e.g. `1 gün 12 saat`. */
export function formatDuration(ms: number, maxParts = 2): string {
  if (ms < SECOND) return '0 saniye';
  const parts: string[] = [];
  let rest = ms;
  for (const [unitMs, label] of FORMAT_UNITS) {
    if (parts.length >= maxParts) break;
    const amount = Math.floor(rest / unitMs);
    if (amount > 0) {
      parts.push(`${amount} ${label}`);
      rest -= amount * unitMs;
    }
  }
  return parts.join(' ');
}

/** Formats milliseconds in the compact input syntax, e.g. `1g12sa`. */
export function formatDurationInput(ms: number): string {
  const units: [number, string][] = [
    [WEEK, 'hf'],
    [DAY, 'g'],
    [HOUR, 'sa'],
    [MINUTE, 'dk'],
    [SECOND, 'sn'],
  ];
  let rest = ms;
  let out = '';
  for (const [unitMs, suffix] of units) {
    const amount = Math.floor(rest / unitMs);
    if (amount > 0) {
      out += `${amount}${suffix}`;
      rest -= amount * unitMs;
    }
  }
  return out || '0sn';
}

export const DURATION_PRESETS: { label: string; value: string }[] = [
  { label: '60 saniye', value: '60sn' },
  { label: '5 dakika', value: '5dk' },
  { label: '10 dakika', value: '10dk' },
  { label: '30 dakika', value: '30dk' },
  { label: '1 saat', value: '1sa' },
  { label: '6 saat', value: '6sa' },
  { label: '1 gün', value: '1g' },
  { label: '3 gün', value: '3g' },
  { label: '1 hafta', value: '1hf' },
  { label: '4 hafta', value: '4hf' },
];
