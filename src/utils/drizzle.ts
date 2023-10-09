import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";

// @ts-expect-error typescript issues but it's chill
let db: ReturnType<typeof drizzle<typeof schema>> = global.db;

if (!db) {
  const conn_string = process.env.DB_URI;
  if (conn_string === undefined) {
    throw new Error("Failed to start up, need to set DB_URI");
  }

  const connectionPool = createPool({
    uri: conn_string,
    multipleStatements: true,
  });

  db = drizzle(connectionPool, {
    schema,
    mode: "default",
    logger: false,
  });
}

export { db };
