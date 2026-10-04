import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/** Location of the generated SQL migrations; `MIGRATIONS_DIR` overrides it in bundled builds. */
export function migrationsFolder(): string {
  return process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL('../drizzle', import.meta.url));
}

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: migrationsFolder() });
  } finally {
    await pool.end();
  }
}
