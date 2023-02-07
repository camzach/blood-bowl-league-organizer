import SessionProvider from 'components/session-provider-client';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import type { PropsWithChildren, ReactElement } from 'react';
import PasswordChangeNotif from './password-change-notif';

export default async function RootLayout({ children }: PropsWithChildren): Promise<ReactElement> {
  const session = await getServerSession(authOptions);

  return (
    <html>
      <body>
        <SessionProvider session={session}>
          {!session && <Link href="/api/auth/signin">Sign In</Link>}
          {((session?.user.needsNewPassword) === true) && <PasswordChangeNotif name={session.user.id} />}
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
