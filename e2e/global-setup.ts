import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { expect } from "@playwright/test";

export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl)
    throw new Error("DATABASE_URL must be set before running e2e tests");

  // Refuse to wipe any DB whose name doesn't end with _test
  const dbName = new URL(dbUrl).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to drop database "${dbName}" — name must end with _test`,
    );
  }

  // Derive admin URL: same host/credentials, connect to the default postgres DB
  const adminUrl = new URL(dbUrl);
  adminUrl.pathname = "/postgres";

  const admin = new Client({ connectionString: adminUrl.toString() });
  await expect(() => admin.connect()).toPass();

  // Ensure test database exists
  const checkDb = await admin.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [dbName],
  );
  if (checkDb.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();

  const db = drizzle(dbUrl);
  await migrate(db, { migrationsFolder: "./drizzle" });
}
