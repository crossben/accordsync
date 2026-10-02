import type { WireOp } from '@accordsync/core';
import type { StorageAdapter, StorageSnapshot, StorageTx, StoredMeta } from './adapter';

/** In-memory storage: for tests, and for apps that accept losing unsynced writes on restart. */
export class MemoryStorage implements StorageAdapter {
  #ops = new Map<string, WireOp>();
  #outbox = new Set<string>();
  #meta: StoredMeta | undefined;

  async load(): Promise<StorageSnapshot> {
    return structuredClone({
      meta: this.#meta,
      ops: [...this.#ops.values()],
      outbox: [...this.#outbox],
    });
  }

  async commit(tx: StorageTx): Promise<void> {
    const t = structuredClone(tx);
    if (t.clearOps) this.#ops.clear();
    for (const id of t.deleteOps ?? []) this.#ops.delete(id);
    for (const op of t.putOps ?? []) this.#ops.set(op.op_id, op);
    for (const id of t.outboxAdd ?? []) this.#outbox.add(id);
    for (const id of t.outboxDelete ?? []) this.#outbox.delete(id);
    if (t.meta) this.#meta = t.meta;
  }
}
