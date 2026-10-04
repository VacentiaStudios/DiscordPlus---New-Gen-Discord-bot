import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
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
