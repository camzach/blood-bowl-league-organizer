import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./utils/drizzle";
import { admin, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { account, member } from "db/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    password: {
      //TODO: Remove this once passwords are converted to scrypt
      verify: async (...params) => {
        const [{ password, hash }] = params;
        if (
          hash.startsWith("$2") &&
          (await bcrypt.compare(password.normalize("NFKC"), hash))
        ) {
          const salt = Buffer.from(
            crypto.getRandomValues(new Uint8Array(16)),
          ).toString("hex");
          const key = crypto
            .scryptSync(password.normalize("NFKC"), salt, 64, {
              N: 16384,
              r: 16,
              p: 1,
              maxmem: 128 * 16384 * 16 * 2,
            })
            .toString("hex");
          const newPassword = `${salt}:${key}`;
          await db
            .update(account)
            .set({ password: newPassword })
            .where(eq(account.password, hash));
          return true;
        }

        const [salt, key] = hash.split(":");
        const verificationHash = crypto
          .scryptSync(password.normalize("NFKC"), salt, 64, {
            N: 16384,
            r: 16,
            p: 1,
            maxmem: 128 * 16384 * 16 * 2,
          })
          .toString("hex");
        return key === verificationHash;
      },
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    },
  },
});
