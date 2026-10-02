import { type Migration, Migrator } from 'kysely/migration';
import type { Db } from './db';
import * as m0001 from './migrations/0001_meta';
import * as m0002 from './migrations/0002_sync';

// Listed explicitly (not read from disk) so the bundled server carries its migrations.
const migrations: Record<string, Migration> = {
  '0001_meta': m0001,
  '0002_sync': m0002,
};

export async function migrateToLatest(db: Db): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error, results } = await migrator.migrateToLatest();
  for (const r of results ?? []) {
    if (r.status === 'Error') console.error(`migration ${r.migrationName} failed`);
  }
  if (error) throw error;
}
