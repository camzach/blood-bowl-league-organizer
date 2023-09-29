import type { AuthOptions } from "next-auth";
import nextAuth from "next-auth";
import credentialsProvider from "next-auth/providers/credentials";
import drizzle from "../../../utils/drizzle";
import { compare } from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    };
  }
  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user: {
      id: string;
    };
  }
}

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 30,
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.user = user;
      return token;
    },
    session: ({ session, token }) => {
      session.user = token.user;
      return session;
    },
  },
  providers: [
    credentialsProvider({
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        const user = await drizzle.query.coach.findFirst({
          where: (coach, { eq }) => eq(coach.name, username),
          with: {
            coachToTeam: { with: { team: { columns: { name: true } } } },
          },
        });

        if (!user) throw new Error("CredentialsSignin");

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) throw new Error("CredentialsSignin");
        const userObj = {
          id: user.name,
        };
        return userObj;
      },
    }),
  ],
};

export default nextAuth(authOptions);
