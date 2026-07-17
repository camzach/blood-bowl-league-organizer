import { relations } from "../db/schema";
import { drizzle, NeonDatabase } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";

declare global {
  var db: NeonDatabase<typeof relations>;
}

let db = globalThis.db;

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
  db = drizzle({
    client: pool,
    relations,
  });
}

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export { db };
