import {
  getCaseById,
  startDbEventListener,
  type DbEvent,
  type DbEventListener,
} from '@discordplus/db';
import { SETTINGS_SECTION_LABELS } from '@discordplus/shared';
import { EmbedBuilder, escapeMarkdown } from 'discord.js';
import type { BotContext } from '../../core/context';
import type { BotModule } from '../../core/types';
import { COLORS } from '../../core/ui';
import { tr } from '../../locales/tr';
import { sendLogMessage } from '../../services/log-channel';
import { panelCommand } from './command';

let listener: DbEventListener | null = null;

async function handleEvent(ctx: BotContext, event: DbEvent): Promise<void> {
  const guild = ctx.client.guilds.cache.get(event.guildId);
  switch (event.type) {
    case 'settings_updated': {
      ctx.settings.invalidate(event.guildId);
      if (!guild) return;
      // Reads the fresh settings, so a newly chosen mod-log channel gets the note.
      await sendLogMessage(ctx, guild, 'moderation', {
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setDescription(
              tr.panel.settingsChanged(
                SETTINGS_SECTION_LABELS[event.section],
                event.actorId,
                escapeMarkdown(event.actorName),
              ),
            )
            .setTimestamp(),
        ],
      });
      return;
    }
    case 'case_updated': {
      if (!guild) return;
      const row = await getCaseById(ctx.db, event.caseId);
      if (row && row.guildId === guild.id) await ctx.moderation.refreshLogMessage(guild, row);
      return;
    }
  }
}

/** Reacts to changes made in the web panel (delivered through Postgres NOTIFY). */
export const panelModule: BotModule = {
  name: 'panel',
  commands: [panelCommand],
  start(ctx) {
    listener = startDbEventListener({
      connectionString: ctx.env.DATABASE_URL,
      onEvent: (event) => {
        handleEvent(ctx, event).catch((error: unknown) =>
          ctx.logger.error({ err: error, event }, 'Panel event handling failed'),
        );
      },
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
