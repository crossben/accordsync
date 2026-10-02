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
- M0 skeleton: pnpm monorepo (`core`, `client`, `server`, `simulator`), server health endpoint
  with PostgreSQL migrations, Docker image, Compose file, CI.
