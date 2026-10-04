import { z } from 'zod';

/** Discord IDs are 64-bit integers serialized as decimal strings. */
export const snowflakeSchema = z.string().regex(/^\d{17,20}$/, 'Geçersiz Discord ID');

export function isSnowflake(value: unknown): value is string {
  return snowflakeSchema.safeParse(value).success;
}
