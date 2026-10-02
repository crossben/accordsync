// An Accord server for a field app: dossiers belong to an agent and a zone.
// Run: ACCORD_DATABASE_URL=... ACCORD_DEV_SECRET=... accord serve --config accord.config.ts
import { conflict, counter, defineSchema, defineServer, lww, set } from '@accordsync/server';

const schema = defineSchema({
  dossier: {
    agent: lww(),
    zone: lww(),
    client_name: lww(),
    documents: set(),
    visits: counter(),
    status: conflict(), // never auto-resolved
  },
});

export default defineServer({
  schema,
  // Which scope keys a record belongs to, from its current state.
  scopes: {
    dossier: (r) =>
      [
        typeof r.fields.agent === 'string' ? `agent:${r.fields.agent}` : undefined,
        typeof r.fields.zone === 'string' ? `zone:${r.fields.zone}` : undefined,
      ].filter((k) => k !== undefined),
  },
  // Which keys a user may read and write, from the JWT your app issued.
  access: (claims) => {
    const zones = Array.isArray(claims.zones) ? claims.zones.map(String) : [];
    return {
      read: [`agent:${claims.sub}`, ...zones.map((z) => `zone:${z}`)],
      write: [`agent:${claims.sub}`],
    };
  },
  auth: process.env.ACCORD_JWKS_URL
    ? { jwksUrl: process.env.ACCORD_JWKS_URL }
    : { hs256Secret: required('ACCORD_DEV_SECRET') },
});

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required (or set ACCORD_JWKS_URL)`);
  return v;
}
