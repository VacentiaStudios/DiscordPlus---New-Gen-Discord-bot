import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import pg from 'pg';
import { migrationsFolder } from './migrator';
import * as schema from './schema';
import type { Database } from './types';

export interface TestDatabase {
  db: Database;
  client: PGlite;
  close(): Promise<void>;
}

/** In-memory Postgres (PGlite) with all migrations applied. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: migrationsFolder() });
  return { db, client, close: () => client.close() };
}

/** Creates the database named in `connectionString` if it does not exist yet. */
export async function ensureDatabase(connectionString: string): Promise<void> {
  const url = new URL(connectionString);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('select 1 from pg_database where datname = $1', [name]);
    if (!rowCount) await client.query(`create database "${name.replaceAll('"', '""')}"`);
  } finally {
    await client.end();
  }
}
