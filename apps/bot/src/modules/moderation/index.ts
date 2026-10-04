import type { BotModule } from '../../core/types';
import { auditLogEvent } from './audit-log';
import { banCommand, unbanCommand } from './commands/ban';
import {
  caseCommand,
  historyCommand,
  historyContextCommand,
  historyPagination,
} from './commands/cases';
import { lockCommand, purgeCommand, slowmodeCommand, unlockCommand } from './commands/channels';
import { kickCommand, timeoutCommand, untimeoutCommand, warnCommand } from './commands/members';
import { startTempBanScheduler } from './scheduler';

let stopScheduler: (() => void) | null = null;

export const moderationModule: BotModule = {
  name: 'moderation',
  commands: [
    banCommand,
    unbanCommand,
    kickCommand,
    timeoutCommand,
    untimeoutCommand,
    warnCommand,
    purgeCommand,
    slowmodeCommand,
    lockCommand,
    unlockCommand,
    caseCommand,
    historyCommand,
    historyContextCommand,
  ],
  components: [historyPagination],
  events: [auditLogEvent],
  start(ctx) {
    stopScheduler = startTempBanScheduler(ctx);
  },
  stop() {
    stopScheduler?.();
    stopScheduler = null;
  },
};
