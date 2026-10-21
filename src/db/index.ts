import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Database bootstrap. The Pool is created eagerly (so module import and
 * `next build` never require a live database), but `query`/`connect` fail
 * fast with a clear message when DATABASE_URL is missing.
 */

const databaseUrl = process.env.DATABASE_URL;

const MISSING_MESSAGE =
  "DATABASE_URL is not set. Copy .env.example to .env and point it at your PostgreSQL database.";

const poolInstance = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const globalForDb = globalThis as typeof globalThis & {
  __kodisalamaPgPool?: Pool;
};

export const pool: Pool =
  globalForDb.__kodisalamaPgPool ??
  new Proxy(poolInstance, {
    get(target, prop, receiver) {
      if (!databaseUrl && (prop === "query" || prop === "connect")) {
        return () => {
          throw new Error(MISSING_MESSAGE);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kodisalamaPgPool = pool;
}

export const db = drizzle(pool);
