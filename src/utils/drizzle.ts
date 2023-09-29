import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";

const conn_string = process.env.DB_URI;
if (conn_string === undefined) {
  throw new Error("Failed to start up, need to set DB_URI");
}

const connectionPool = createPool(conn_string);

export default drizzle(connectionPool, { schema, mode: "default" });
