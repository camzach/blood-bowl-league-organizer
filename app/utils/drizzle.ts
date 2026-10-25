import { relations } from "~/db/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

// In development/test, we cache the database instance on globalThis to prevent connection pool leaks
let db: NodePgDatabase<typeof relations> | NeonDatabase<typeof relations> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).db;

if (!db) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  if (process.env.VERCEL_ENV) {
    const { drizzle: neonDrizzle } =
      await import("drizzle-orm/neon-serverless");
    const { Pool: NeonPool } = await import("@neondatabase/serverless");
    const pool = new NeonPool({ connectionString: process.env.DATABASE_URL! });
    db = neonDrizzle({
      client: pool,
      relations,
    });
  } else {
    const { drizzle: nodeDrizzle } = await import("drizzle-orm/node-postgres");
    const { Pool: NodePool } = await import("pg");
    const pool = new NodePool({ connectionString: process.env.DATABASE_URL! });
    db = nodeDrizzle({
      client: pool,
      relations,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).db = db;
  }
}

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export { db };
