import type { BotModule } from '../core/types';
import { automodModule } from './automod';
import { generalModule } from './general';
import { guildsModule } from './guilds';
import { loggingModule } from './logging';
import { moderationModule } from './moderation';
import { panelModule } from './panel';

export const modules: readonly BotModule[] = [
  generalModule,
  guildsModule,
  moderationModule,
  loggingModule,
  automodModule,
  panelModule,
];
