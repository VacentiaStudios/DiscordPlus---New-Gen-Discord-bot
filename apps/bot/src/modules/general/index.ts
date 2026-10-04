import type { BotModule } from '../../core/types';
import { helpCommand } from './help';
import { pingCommand } from './ping';

export const generalModule: BotModule = {
  name: 'general',
  commands: [pingCommand, helpCommand],
};
