import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import type { Database } from './types';

export interface DatabaseHandle {
  db: Database;
  pool: pg.Pool;
  close(): Promise<void>;
}

export function createDatabase(
  connectionString: string,
  options: { maxConnections?: number } = {},
): DatabaseHandle {
  const pool = new pg.Pool({ connectionString, max: options.maxConnections ?? 10 });
  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}
