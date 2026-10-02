import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp, createDb, type Db, migrateToLatest } from '../src/index';

describe('server against real PostgreSQL', () => {
  let container: StartedPostgreSqlContainer;
  let db: Db;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    db = createDb(container.getConnectionUri());
    await migrateToLatest(db);
  }, 120_000);

  afterAll(async () => {
    await db?.destroy();
    await container?.stop();
  });

  it('runs migrations', async () => {
    const row = await db
      .selectFrom('accord_meta')
      .select('value')
      .where('key', '=', 'schema_created_at')
      .executeTakeFirst();
    expect(row).toBeDefined();
  });

  it('migrations are idempotent', async () => {
    await expect(migrateToLatest(db)).resolves.toBeUndefined();
  });

  it('reports health with the protocol version', async () => {
    const res = await createApp({ db }).request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', protocolVersion: 1 });
  });
});
