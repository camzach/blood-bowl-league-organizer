import SessionProvider from 'components/session-provider-client';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import type { PropsWithChildren, ReactElement } from 'react';
import PasswordChangeNotif from './password-change-notif';
import './global.css';
import styles from './styles.module.scss';
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
        <header className={styles.header}>
          <h1>BBLO</h1>
          <Link href={`/team/${session?.user.teams[0]}`}>Teams</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/league-table">League Table</Link>
        </header>
        <SessionProvider session={session}>
          {!session && <Link href="/api/auth/signin">Sign In</Link>}
          {((session?.user.needsNewPassword) === true) && <PasswordChangeNotif name={session.user.id} />}
          {children}
        </SessionProvider>
        <Tooltip />
      </body>
    </html>
  );
}
