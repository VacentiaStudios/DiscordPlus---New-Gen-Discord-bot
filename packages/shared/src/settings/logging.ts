import { z } from 'zod';

// Filled in by the logging phase.
export const loggingSettingsSchema = z.object({});

export type LoggingSettings = z.infer<typeof loggingSettingsSchema>;
