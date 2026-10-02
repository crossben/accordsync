import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp, migrateToLatest } from '../src/index';
import { def, type Harness, startHarness } from './harness';

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

  it('answers CORS preflights only for configured origins', async () => {
    const app = createApp({ db: h.db, def: { ...def, cors: ['https://app.example'] } });
    const preflight = (origin: string) =>
      app.request('/v1/push', {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,accord-device,content-type',
        },
      });
    const ok = await preflight('https://app.example');
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
    expect(ok.headers.get('Access-Control-Allow-Headers')).toMatch(/Accord-Device/i);
    const other = await preflight('https://evil.example');
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
