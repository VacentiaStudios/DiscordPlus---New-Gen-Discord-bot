import { startDbEventListener, type DbEvent, type DbEventListener } from '@discordplus/db';
import type { BotContext } from '../../core/context';
import type { BotModule } from '../../core/types';
import { panelCommand } from './command';

let listener: DbEventListener | null = null;

function handleEvent(ctx: BotContext, event: DbEvent): void {
  switch (event.type) {
    case 'settings_updated':
      ctx.settings.invalidate(event.guildId);
      ctx.logger.debug(
        { guildId: event.guildId, section: event.section },
        'Settings changed in panel',
      );
      break;
  }
}

/** Reacts to changes made in the web panel (delivered through Postgres NOTIFY). */
export const panelModule: BotModule = {
  name: 'panel',
  commands: [panelCommand],
  start(ctx) {
    listener = startDbEventListener({
      connectionString: ctx.env.DATABASE_URL,
      onEvent: (event) => handleEvent(ctx, event),
      onConnect: () => {
        // Anything could have changed while we were not listening.
        ctx.settings.clear();
        ctx.logger.info('Listening for panel events');
      },
      onError: (error) => ctx.logger.warn({ err: error }, 'Panel event listener disconnected'),
    });
  },
  async stop() {
    await listener?.stop();
    listener = null;
  },
};
