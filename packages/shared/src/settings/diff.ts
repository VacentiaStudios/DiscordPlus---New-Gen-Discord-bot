export interface SettingsChange {
  /** Dotted path of the changed value, e.g. `channels.moderation`. */
  path: string;
  before: unknown;
  after: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => isEqual(a[key], b[key]));
  }
  return false;
}

/**
 * Lists what changed between two settings documents. Objects are compared field
 * by field; arrays and scalars are reported as a whole.
 */
export function diffSettings(before: unknown, after: unknown, prefix = ''): SettingsChange[] {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((key) =>
      diffSettings(before[key], after[key], prefix ? `${prefix}.${key}` : key),
    );
  }
  return isEqual(before, after) ? [] : [{ path: prefix, before, after }];
}
