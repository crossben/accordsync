# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- M1 pure merge core (`@accordsync/core`): hybrid logical clocks with skew refusal, the op
  model and wire format, four strategies (`lww`, `counter`, `set`, `conflict`), `Replica` and
  `LocalWriter`.
- Property-based strategy-law tests against reference models, and golden vectors in `vectors/`.
- `docs/merge-rules.md`.
- M2 deterministic simulator (`@accordsync/simulator`): in-memory server and devices, push/pull
  with paging, retries and timeouts, and a network that drops, delays, duplicates and reorders
  messages and partitions devices. Every run replays exactly from its seed.
- Convergence suite: under random faults, every device and the server converge to the state of
  exactly the accepted ops; counters equal the sum of accepted increments.
- `LocalWriter.discard`: refused ops are rolled back locally (ADR-0006).
- M0 skeleton: pnpm monorepo (`core`, `client`, `server`, `simulator`), server health endpoint
  with PostgreSQL migrations, Docker image, Compose file, CI.
