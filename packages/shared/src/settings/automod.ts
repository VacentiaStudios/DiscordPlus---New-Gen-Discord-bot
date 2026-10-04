import { z } from 'zod';

// Filled in by the AutoMod phase.
export const automodSettingsSchema = z.object({});

export type AutomodSettings = z.infer<typeof automodSettingsSchema>;
