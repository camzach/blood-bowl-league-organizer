import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";

// @ts-expect-error typescript issues but it's chill
let db: ReturnType<typeof drizzle<typeof schema>> = global.db;

if (!db) {
  db = drizzle(sql, {
    schema,
    logger: false,
  });
}

export { db };
