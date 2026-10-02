import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig } from './config';
import { createDb } from './db';
import { migrateToLatest } from './migrate';

const config = loadConfig();
const db = createDb(config.databaseUrl);
await migrateToLatest(db);

const server = serve({ fetch: createApp({ db }).fetch, port: config.port }, (info) => {
  console.log(`accord server listening on :${info.port}`);
});

const shutdown = () => {
  server.close(() => void db.destroy().then(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
