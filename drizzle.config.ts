import type { Config } from "drizzle-kit";

export default {
  schema: ["./db/schema/bblo.ts", "./db/schema/auth.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
