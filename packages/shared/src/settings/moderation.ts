import { z } from 'zod';

// Filled in by the moderation phase.
export const moderationSettingsSchema = z.object({});

export type ModerationSettings = z.infer<typeof moderationSettingsSchema>;
