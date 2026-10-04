import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import type * as schema from './schema';

export type Schema = typeof schema;

/** Driver-agnostic database type: node-postgres in production, PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT, Schema>;

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  Schema,
  ExtractTablesWithRelations<Schema>
>;

/** Anything queries can run on: the database itself or an open transaction. */
export type DbExecutor = Database | Transaction;
