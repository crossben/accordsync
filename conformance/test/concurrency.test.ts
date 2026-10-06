import { beforeEach, describe, expect, it } from 'vitest';
import { control, Device, opIds, type WireOp } from './accord';

/**
 * ADR-0010: pushes run concurrently, and a pull only reads up to the oldest transaction still
 * running, so no reader ever moves its cursor past an op that commits later.
 */
describe('concurrent pushes and pulls (ADR-0010)', () => {
  beforeEach(async () => {
    await control.reset();
  });

  it('every acked op reaches every reader exactly once, while pushes and pulls overlap', async () => {
    const WRITERS = 8;
    const BATCHES = 8;
    const writers = await Promise.all(
      Array.from({ length: WRITERS }, (_, i) => Device.of(`w${i}`, `u${i}`, { zones: ['all'] })),
    );
    const readers = await Promise.all(
      [0, 1, 2].map((i) => Device.of(`r${i}`, `reader${i}`, { readonly_zones: ['all'] })),
    );

    const acked = new Set<string>();
    // dossier:shared is created first (zone all), so every writer may then write it.
    const creator = writers[0]!;
    const created = await creator.pushOk([
      creator.assign('dossier:shared', 'zone', 'all'),
      creator.inc('dossier:shared', 'visits'),
    ]);
    for (const id of created.acked) acked.add(id);
    let done = false;
    const pushing = Promise.all(
      writers.map(async (w, i) => {
        const record = `dossier:${i}`;
        // Batches built in write order (op numbers increase), as a client pushes its outbox.
        const batches: WireOp[][] = [];
        for (let b = 0; b < BATCHES; b++) {
          const batch =
            b === 0
              ? [w.assign(record, 'agent', `u${i}`), w.assign(record, 'zone', 'all')]
              : [w.inc(record, 'visits'), w.add(record, 'docs', `d${b}`)];
          batch.push(w.inc(record, 'visits'));
          // Every writer also writes a shared record, so pushes contend for the same row lock.
          if (i > 0) batch.push(w.inc('dossier:shared', 'visits'));
          batches.push(batch);
        }
        for (const batch of batches) {
          // Each batch is sent twice at once: a retry racing the original.
          const [x, y] = await Promise.all([w.pushOk(batch), w.pushOk(batch)]);
          expect(x.refused).toEqual([]);
          expect(new Set(y.acked)).toEqual(new Set(x.acked));
          for (const id of x.acked) acked.add(id);
        }
      }),
    ).finally(() => (done = true));

    const seen = readers.map(() => [] as string[]);
    const reading = readers.map(async (r, i) => {
      while (!done) {
        seen[i]!.push(...opIds(await r.pullAll(4)));
        await new Promise((res) => setTimeout(res, 15));
      }
    });
    await pushing;
    await Promise.all(reading);
    for (const [i, r] of readers.entries()) seen[i]!.push(...opIds(await r.pullAll(4)));

    expect(acked.size).toBeGreaterThan(WRITERS * BATCHES * 3);
    for (const ids of seen) {
      expect(ids.length).toBe(new Set(ids).size); // nothing twice
      expect(new Set(ids)).toEqual(acked); // nothing skipped, nothing extra
    }
  }, 60_000);

  it('simultaneous pulls from one device all succeed (no 500 from a serialization conflict)', async () => {
    const d = await Device.of('busy-phone', 'busy', { zones: ['z'] });
    await d.pushOk([d.assign('dossier:1', 'zone', 'z'), d.inc('dossier:1', 'visits')]);
    for (let round = 0; round < 5; round++) {
      const answers = await Promise.all(Array.from({ length: 8 }, () => d.pullRaw(0)));
      expect(answers.map((a) => a.status)).toEqual(Array(8).fill(200));
    }
  });
});
