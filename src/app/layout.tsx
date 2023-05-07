import SessionProvider from 'components/session-provider-client';
import { getServerSession } from 'next-auth';
import Link from 'components/link';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import type { PropsWithChildren, ReactElement } from 'react';
import PasswordChangeNotif from './password-change-notif';
import './global.css';
import type { Metadata } from 'next';
import Tooltip from 'components/tooltip';

export const metadata: Metadata = {
  title: { template: '%s | BBLO', absolute: 'BBLO' },
  description: 'Blood Bowl League Organizer',
};

export default async function RootLayout({ children }: PropsWithChildren): Promise<ReactElement> {
  const session = await getServerSession(authOptions);

  return (
    <html>
      <body>
        <header className="flex items-center gap-8 bg-gray-300 p-2">
          <h1 className="m-0 inline-block w-min text-4xl">BBLO</h1>
          <nav className="contents">
            <Link className="text-2xl" href={`/team/${session?.user.teams[0]}`}>
              Teams
            </Link>
            <Link className="text-2xl" href="/schedule">
              Schedule
            </Link>
            <Link className="text-2xl" href="/league-table">
              League Table
            </Link>
          </nav>
        </header>
        <SessionProvider session={session}>
          {!session && <Link href="/api/auth/signin">Sign In</Link>}
          {session?.user.needsNewPassword === true && (
            <PasswordChangeNotif name={session.user.id} />
          )}
          {children}
        </SessionProvider>
        <Tooltip />
      </body>
    </html>
  );
}
