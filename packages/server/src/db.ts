import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

/** Table types grow with each migration. */
export interface Database {
  accord_meta: { key: string; value: string };
}

export type Db = Kysely<Database>;

export function createDb(databaseUrl: string): Db {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: databaseUrl }) }),
  });
}
