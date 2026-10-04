import type { BotModule } from '../core/types';
import { generalModule } from './general';
import { guildsModule } from './guilds';
import { moderationModule } from './moderation';
import { panelModule } from './panel';

export const modules: readonly BotModule[] = [
  generalModule,
  guildsModule,
  moderationModule,
  panelModule,
];
