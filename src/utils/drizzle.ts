import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { drizzle as devDrizzle } from "drizzle-orm/node-postgres";
import { sql } from "@vercel/postgres";
import { Client } from "pg";

// @ts-expect-error typescript issues but it's chill
let db: ReturnType<typeof drizzle<typeof schema>> = global.db;

if (!db) {
  if (process.env.NODE_ENV === "development") {
    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
    });
    await client.connect();
    db = devDrizzle(client, { schema, logger: false }) as typeof db;
  } else {
    db = drizzle(sql, {
      schema,
      logger: false,
    });
  }
}

export { db };
