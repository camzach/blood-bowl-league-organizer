import type { AuthOptions } from 'next-auth';
import nextAuth from 'next-auth';
import credentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '../../../utils/prisma';
import { compare } from 'bcryptjs';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      teams: string[];
      needsNewPassword: boolean;
    };
  }
  interface User {
    id: string;
    teams: string[];
    needsNewPassword: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user: {
      id: string;
      teams: string[];
      needsNewPassword: boolean;
    };
  }
}

export const authOptions: AuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 30,
  },
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

        const user = await prisma.coach.findFirst({
          where: { name: { equals: username, mode: 'insensitive' } },
          include: { teams: { select: { name: true } } },
        });

        if (!user)
          throw new Error('CredentialsSignin');

        const isValid = await compare(password, user.passwordHash);

        if (!isValid)
          throw new Error('CredentialsSignin');
        const userObj = { id: user.name, teams: user.teams.map(t => t.name), needsNewPassword: user.needsNewPassword };
        return userObj;
      },
    }),
  ],
};

export default nextAuth(authOptions);
