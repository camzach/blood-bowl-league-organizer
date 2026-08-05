import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { db } from "./drizzle";
import { schema } from "~/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    schema,
    provider: "pg",
  }),
  experimental: { joins: true },
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const league = await db.query.member.findFirst({
            where: { userId: session.userId },
          });
          return {
            data: {
              ...session,
              activeOrganizationId: league?.leagueId,
            },
          };
        },
      },
    },
  },
  plugins: [
    admin(),
    organization({
      schema: {
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
