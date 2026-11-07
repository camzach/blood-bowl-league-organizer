import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { organization } from "better-auth/plugins";
import { db } from "./drizzle";
import { schema } from "~/db/schema";

export const auth = betterAuth({
  rateLimit: {
    enabled:
      process.env.NODE_ENV === "production" &&
      !process.env.DATABASE_URL?.includes("_test"),
  },
  database: drizzleAdapter(db, {
    schema,
    provider: "pg",
  }),
  advanced: { database: { joins: true } },
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const membership = await db.query.member.findFirst({
            where: { userId: session.userId },
          });
          return {
            data: {
              ...session,
              activeOrganizationId: membership?.leagueId,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      schema: {
        session: {
          fields: {
            activeOrganizationId: "activeLeagueId",
          },
        },
        organization: {
          modelName: "league",
        },
        member: {
          fields: {
            organizationId: "leagueId",
          },
        },
        invitation: {
          fields: {
            organizationId: "leagueId",
          },
        },
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    },
  },
});
