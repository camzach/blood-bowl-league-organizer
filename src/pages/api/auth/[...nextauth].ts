import type { AuthOptions } from 'next-auth';
import nextAuth from 'next-auth';
import credentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '../../../utils/prisma';
import { compare } from 'bcryptjs';

/** Example on how to extend the built-in session types */
declare module 'next-auth' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Session {
    /** This is an example. You can find me in types/next-auth.d.ts */
    user: {
      teams: string[];
    };
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface User {
    teams: string[];
  }
}

/** Example on how to extend the built-in types for JWT */
declare module 'next-auth/jwt' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface JWT {
    /** This is an example. You can find me in types/next-auth.d.ts */
    user: { teams: string[] };
  }
}

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user)
        token.user = user;
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
        username: { label: 'Username', type: 'text', placeholder: 'jsmith' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        const user = await prisma.coach.findFirstOrThrow({
          where: { name: { equals: username, mode: 'insensitive' } },
          include: { teams: { select: { name: true } } },
        });
        console.log(user, password);
        const isValid = await compare(password, user.passwordHash);

        if (!isValid)
          throw new Error('Wrong credentials. Try again.');

        return { id: user.name, teams: user.teams.map(t => t.name) };
      },
    }),
  ],
};

export default nextAuth(authOptions);
