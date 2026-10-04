import pg from 'pg';
import { DB_EVENTS_CHANNEL, parseDbEvent, type DbEvent } from './events';

export interface DbEventListenerOptions {
  connectionString: string;
  onEvent: (event: DbEvent) => void;
  /**
   * Called after every successful (re)connection. Notifications sent while the
   * listener was disconnected are lost, so callers should drop their caches here.
   */
  onConnect?: () => void;
  onError?: (error: unknown) => void;
}

export interface DbEventListener {
  stop(): Promise<void>;
}

const MAX_BACKOFF_MS = 30_000;

/** Keeps a dedicated connection that LISTENs for panel events, reconnecting with backoff. */
export function startDbEventListener(options: DbEventListenerOptions): DbEventListener {
  let current: pg.Client | null = null;
  let stopped = false;
  let attempt = 0;
  let timer: NodeJS.Timeout | null = null;

  const scheduleReconnect = () => {
    if (stopped || timer) return;
    const delay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** attempt);
    attempt += 1;
    timer = setTimeout(() => {
      timer = null;
      void connect();
    }, delay);
  };

  const handleDisconnect = (client: pg.Client, error?: unknown) => {
    if (client !== current) return;
    current = null;
    client.removeAllListeners('notification');
    client.end().catch(() => undefined);
    if (error) options.onError?.(error);
    scheduleReconnect();
  };

  const connect = async () => {
    const client = new pg.Client({ connectionString: options.connectionString });
    current = client;
    client.on('notification', (message) => {
      if (message.channel !== DB_EVENTS_CHANNEL) return;
      const event = parseDbEvent(message.payload);
      if (event) options.onEvent(event);
    });
    client.on('error', (error) => handleDisconnect(client, error));
    client.on('end', () => handleDisconnect(client));

    try {
      await client.connect();
      await client.query(`LISTEN ${DB_EVENTS_CHANNEL}`);
    } catch (error) {
      handleDisconnect(client, error);
      return;
    }

    if (stopped) {
      await client.end().catch(() => undefined);
      return;
    }
    attempt = 0;
    options.onConnect?.();
  };

  void connect();

  return {
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      const client = current;
      current = null;
      if (client) {
        client.removeAllListeners();
        await client.end().catch(() => undefined);
      }
    },
  };
}
