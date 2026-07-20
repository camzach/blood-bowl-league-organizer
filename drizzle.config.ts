import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config();

export default {
  schema: ["./src/db/schema/bblo.ts", "./src/db/schema/auth.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
