import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config();

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL ?? "",
  },
} satisfies Config;
