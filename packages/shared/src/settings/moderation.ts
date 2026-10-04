import { z } from 'zod';
import { PUNISHMENTS } from '../cases';
import { DURATION, MAX_TIMEOUT_MS } from '../duration';

export const MAX_TEMP_BAN_MS = 365 * DURATION.DAY;
export const MAX_WARN_THRESHOLDS = 10;

export const warnThresholdSchema = z
  .object({
    /** Number of active warnings that triggers the punishment. */
    count: z.number().int().min(1).max(50),
    action: z.enum(PUNISHMENTS),
    /** Required for timeouts; optional for bans (temporary ban); unused for kicks. */
    durationMs: z.number().int().min(DURATION.MINUTE).max(MAX_TEMP_BAN_MS).nullable().default(null),
  })
  .superRefine((threshold, ctx) => {
    if (threshold.action === 'timeout') {
      if (threshold.durationMs === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['durationMs'],
          message: 'Susturma için süre gerekli',
        });
      } else if (threshold.durationMs > MAX_TIMEOUT_MS) {
        ctx.addIssue({
          code: 'custom',
          path: ['durationMs'],
          message: 'Susturma en fazla 28 gün olabilir',
        });
      }
    }
    if (threshold.action === 'kick' && threshold.durationMs !== null) {
      ctx.addIssue({ code: 'custom', path: ['durationMs'], message: 'Atma için süre kullanılmaz' });
    }
  });

export type WarnThreshold = z.infer<typeof warnThresholdSchema>;

export const moderationSettingsSchema = z.object({
  /** DM the user (with the reason) before warning, muting, kicking or banning them. */
  dmOnAction: z.boolean().default(true),
  /** Warnings older than this stop counting towards thresholds; 0 means they never expire. */
  warnExpiryDays: z.number().int().min(0).max(365).default(0),
  thresholds: z
    .array(warnThresholdSchema)
    .max(MAX_WARN_THRESHOLDS)
    .default([])
    .superRefine((thresholds, ctx) => {
      const seen = new Set<number>();
      thresholds.forEach((threshold, index) => {
        if (seen.has(threshold.count)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'count'],
            message: 'Her uyarı sayısı için yalnızca bir eşik olabilir',
          });
        }
        seen.add(threshold.count);
      });
    }),
});

export type ModerationSettings = z.infer<typeof moderationSettingsSchema>;

/** The threshold reached exactly at `activeWarnings`, if any. */
export function thresholdFor(
  thresholds: readonly WarnThreshold[],
  activeWarnings: number,
): WarnThreshold | undefined {
  return thresholds.find((threshold) => threshold.count === activeWarnings);
}
