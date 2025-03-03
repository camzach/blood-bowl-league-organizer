import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";

// @ts-expect-error typescript issues but it's chill
let db: ReturnType<typeof drizzle<typeof schema>> = global.db;

if (!db) {
  if (!process.env.VERCEL_ENV) {
    // Set the WebSocket proxy to work with the local instance
    neonConfig.wsProxy = (host) => `${host}:5433/v1`;
    // Disable all authentication and encryption
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  db = drizzle(pool, {
    schema,
    logger: false,
  });
}

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export { db };
