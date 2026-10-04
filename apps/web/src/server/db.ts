import 'server-only';
import { createDatabase, type Database, type DatabaseHandle } from '@discordplus/db';
import { getServerEnv } from './env';

// Survive hot reloads in development instead of opening a new pool each time.
const globalForDb = globalThis as typeof globalThis & { __discordplusDb?: DatabaseHandle };

export function getDb(): Database {
  globalForDb.__discordplusDb ??= createDatabase(getServerEnv().DATABASE_URL);
  return globalForDb.__discordplusDb.db;
}
