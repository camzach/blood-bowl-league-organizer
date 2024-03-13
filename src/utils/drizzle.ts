import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

// @ts-expect-error typescript issues but it's chill
let db: ReturnType<typeof drizzle<typeof schema>> = global.db;

if (!db) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  db = drizzle(pool, {
    schema,
    logger: false,
  });
}

export { db };
