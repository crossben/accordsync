import { assertNode, PROTOCOL_VERSION } from '@accordsync/core';
import { Value } from '@sinclair/typebox/value';
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { sql } from 'kysely';
import { AuthError, createVerifier } from './auth';
import type { Db } from './db';
import type { ServerDefinition } from './define';
import { PushRequestSchema } from './protocol';
import {
  BadRequest,
  type Caller,
  Forbidden,
  pull,
  push,
  type SyncContext,
  touchDevice,
} from './sync';

export interface AppDeps {
  db: Db;
  def: ServerDefinition;
  /** Physical time in ms (injectable for tests). */
  now?: () => number;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const verify = createVerifier(deps.def.auth);
  const ctx: SyncContext = { db: deps.db, def: deps.def, now: deps.now ?? Date.now };

  app.use(async (c, next) => {
    await next();
    c.header('Accord-Protocol', String(PROTOCOL_VERSION));
  });

  if (deps.def.cors?.length) {
    app.use(
      cors({
        origin: [...deps.def.cors],
        allowHeaders: ['Authorization', 'Accord-Device', 'Content-Type'],
        exposeHeaders: ['Accord-Protocol'],
        maxAge: 600,
      }),
    );
  }

  app.onError((err, c) => {
    if (err instanceof AuthError) return c.json({ error: err.message }, 401);
    if (err instanceof Forbidden) return c.json({ error: err.message }, 403);
    if (err instanceof BadRequest) return c.json({ error: err.message }, 400);
    console.error(err);
    return c.json({ error: 'internal error' }, 500);
  });

  app.get('/health', async (c) => {
    try {
      await sql`select 1`.execute(deps.db);
      return c.json({ status: 'ok', protocolVersion: PROTOCOL_VERSION });
    } catch {
      return c.json({ status: 'unavailable', reason: 'database unreachable' }, 503);
    }
  });

  const caller = async (c: Context): Promise<Caller> => {
    const claims = await verify(c.req.header('Authorization'));
    const deviceId = c.req.header('Accord-Device') ?? '';
    try {
      assertNode(deviceId);
    } catch {
      throw new BadRequest('Accord-Device header must be a device id ([A-Za-z0-9_-]{1,64})');
    }
    const access = deps.def.access(claims);
    const who: Caller = { sub: claims.sub, deviceId, read: access.read, write: access.write };
    await touchDevice(deps.db, who);
    return who;
  };

  app.post('/v1/push', async (c) => {
    const who = await caller(c);
    const body: unknown = await c.req.json().catch(() => {
      throw new BadRequest('body must be JSON');
    });
    if (!Value.Check(PushRequestSchema, body))
      throw new BadRequest('body must be { "ops": [...] }');
    return c.json(await push(ctx, who, body.ops));
  });

  app.get('/v1/pull', async (c) => {
    const who = await caller(c);
    const cursor = Number(c.req.query('cursor') ?? '0');
    const limit = Number(c.req.query('limit') ?? '500');
    if (!Number.isSafeInteger(cursor) || cursor < 0)
      throw new BadRequest('cursor must be an integer ≥ 0');
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new BadRequest('limit must be an integer ≥ 1');
    return c.json(await pull(ctx, who, cursor, limit));
  });

  return app;
}
