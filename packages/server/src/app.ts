import { PROTOCOL_VERSION } from '@accordsync/core';
import { Hono } from 'hono';
import { sql } from 'kysely';
import type { Db } from './db';

export function createApp(deps: { db: Db }): Hono {
  const app = new Hono();

  app.get('/health', async (c) => {
    try {
      await sql`select 1`.execute(deps.db);
      return c.json({ status: 'ok', protocolVersion: PROTOCOL_VERSION });
    } catch {
      return c.json({ status: 'unavailable', reason: 'database unreachable' }, 503);
    }
  });

  return app;
}
