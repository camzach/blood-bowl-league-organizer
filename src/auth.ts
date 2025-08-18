import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./utils/drizzle";
import { admin, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { member } from "~/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const league = await db.query.member.findFirst({
            where: eq(member.userId, session.userId),
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
