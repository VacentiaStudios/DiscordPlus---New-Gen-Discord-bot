import { createDatabase, startDbEventListener, type DbEvent } from '@discordplus/db';
import { E2E_ENV } from './env';

export function openDatabase() {
  return createDatabase(E2E_ENV.DATABASE_URL, { maxConnections: 2 });
}

/** Collects the panel events the bot would receive, like the bot's own listener. */
export async function listenForEvents(): Promise<{ events: DbEvent[]; stop(): Promise<void> }> {
  const events: DbEvent[] = [];
  let connected: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => (connected = resolve));
  const listener = startDbEventListener({
    connectionString: E2E_ENV.DATABASE_URL,
    onEvent: (event) => events.push(event),
    onConnect: () => connected(),
  });
  await ready;
  return { events, stop: () => listener.stop() };
}
