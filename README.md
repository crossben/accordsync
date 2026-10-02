# Accord

**Offline-first sync that stays correct when the network lies.**

Apps keep working with no connection. When it comes back, Accord passes every change along, and
every device ends up with the same data. Every device, in accord.

> **Status: in development, not released.** Nothing here is ready to use yet. Design decisions
> are recorded in [`docs/adr/`](docs/adr/).

## What it will be

- Apps write **locally first** (SQLite or IndexedDB). The network is never on the critical path of a
  user action.
- Every change is an **operation** in an append-only log, ordered by hybrid logical clocks.
- On reconnect, operations sync both ways and merge by **rules you declare per field**:

  ```ts
  const schema = defineSchema({
    dossier: {
      client_name: lww(), // highest clock wins
      documents: set(), // add-wins set
      visits: counter(), // increments are never lost
      status: conflict(), // never auto-resolved: your app decides
    },
  });
  ```

  See [docs/merge-rules.md](docs/merge-rules.md).

- A self-hosted server (Node, PostgreSQL) enforces who can read and write what.
- Correctness is the product: property-based convergence tests under simulated network faults,
  reproducible by seed.

Last write wins is not an accord. It's a coin toss.

## What Accord is not

- **Not a database.** It syncs records defined by your schema; it is not a general query engine.
- **Not real-time collaboration on free text** in v1. Fields are scalars, sets and counters.
- **Not magic for business conflicts.** If two agents approve the same dossier differently, Accord
  keeps both values and tells your app. It never guesses on money or legal status.

## Repository layout

| Path                 | What                                                                |
| -------------------- | ------------------------------------------------------------------- |
| `packages/core`      | Pure merge core: clocks, operations, strategies. No I/O.            |
| `packages/client`    | Local-first client: storage adapters, background sync, conflict API |
| `packages/server`    | Sync server: Hono + PostgreSQL                                      |
| `packages/simulator` | Deterministic network and device simulator                          |
| `vectors/`           | Golden test vectors every implementation must pass                  |
| `docs/adr/`          | Architecture decision records                                       |

## Develop

Requires Node 22.12+ (24 recommended), pnpm 11 (`corepack enable`), and Docker for the server
tests.

```sh
pnpm install
pnpm build
pnpm test            # server tests start PostgreSQL 16 with Testcontainers
pnpm lint && pnpm typecheck

docker compose up --build   # PostgreSQL + server on :8080
curl localhost:8080/health
```

## Licence

[Apache-2.0](LICENSE).
