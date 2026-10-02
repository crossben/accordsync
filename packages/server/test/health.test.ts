import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateToLatest } from '../src/index';
import { type Harness, startHarness } from './harness';

describe('server against real PostgreSQL', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startHarness();
  }, 120_000);

  afterAll(async () => h?.stop());

  it('migrations are idempotent', async () => {
    await expect(migrateToLatest(h.db)).resolves.toBeUndefined();
  });

  it('reports health with the protocol version', async () => {
    const res = await h.app.request('/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('Accord-Protocol')).toBe('1');
    expect(await res.json()).toEqual({ status: 'ok', protocolVersion: 1 });
  });
});
