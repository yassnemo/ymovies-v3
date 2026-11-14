import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '#shared/schema.ts';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?'
  );
}

// Strip channel_binding=require from pooler URLs — PgBouncer doesn't support it
const dbUrl = process.env.DATABASE_URL.replace(
  /[&?]channel_binding=require/g,
  ''
);

export const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 5
});
export const db = drizzle({ client: pool, schema });

// Quick startup health check (non-blocking)
pool
  .query('SELECT 1')
  .then(() => {
    console.log('[Database] Connected successfully.');
  })
  .catch((err) => {
    console.warn('[Database] Initial connection failed:', err.message);
  });
