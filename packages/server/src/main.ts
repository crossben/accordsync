#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig } from './config';
import { createDb } from './db';
import type { ServerDefinition } from './define';
import { migrateToLatest } from './migrate';

const USAGE = `Usage: accord serve [--config ./accord.config.ts]

Environment:
  ACCORD_DATABASE_URL  PostgreSQL connection string (required)
  ACCORD_PORT          HTTP port (default 8080)`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { config: { type: 'string', default: 'accord.config.ts' }, help: { type: 'boolean' } },
});

if (values.help || positionals[0] !== 'serve') {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

const file = resolve(values.config);
const mod = (await import(pathToFileURL(file).href)) as { default?: ServerDefinition };
if (!mod.default) throw new Error(`${file} must export default defineServer({...})`);

const config = loadConfig();
const db = createDb(config.databaseUrl);
await migrateToLatest(db);

const server = serve(
  { fetch: createApp({ db, def: mod.default }).fetch, port: config.port },
  (info) => {
    console.log(`accord server listening on :${info.port} (config ${file})`);
  },
);

const shutdown = () => {
  server.close(() => void db.destroy().then(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
