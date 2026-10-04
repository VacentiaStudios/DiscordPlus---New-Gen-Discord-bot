import type { BotModule } from '../core/types';
import { generalModule } from './general';
import { guildsModule } from './guilds';
import { panelModule } from './panel';

export const modules: readonly BotModule[] = [generalModule, guildsModule, panelModule];
