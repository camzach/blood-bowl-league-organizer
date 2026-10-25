import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "~/db/schema";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const testDb = drizzle({ client: pool, relations });

export type TestDb = typeof testDb;
