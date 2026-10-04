import { Events } from 'discord.js';
import { defineEvent, type BotModule } from '../../core/types';
import { AutomodEngine, type AutomodOptions } from './engine';

const SWEEP_INTERVAL_MS = 60_000;

/** AutoMod: spam, duplicate, profanity, invite, link, caps and mention filters. */
export function createAutomodModule(options?: AutomodOptions): BotModule {
  const engine = new AutomodEngine(options);
  let sweeper: NodeJS.Timeout | null = null;
  return {
    name: 'automod',
    events: [
      defineEvent({
        event: Events.MessageCreate,
        handle: (ctx, message) => engine.handleMessage(ctx, message),
      }),
      defineEvent({
        event: Events.MessageUpdate,
        handle: (ctx, before, after) => engine.handleEdit(ctx, before, after),
      }),
    ],
    start() {
      sweeper = setInterval(() => engine.sweep(), SWEEP_INTERVAL_MS);
      sweeper.unref();
    },
    stop() {
      if (sweeper) clearInterval(sweeper);
      sweeper = null;
    },
  };
}

export const automodModule = createAutomodModule();
