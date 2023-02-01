import SessionProvider from 'components/session-provider-client';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import type { PropsWithChildren, ReactElement } from 'react';

export default async function RootLayout({ children }: PropsWithChildren): Promise<ReactElement> {
  const session = await getServerSession();

  return (
    <html>
      <body>
        <SessionProvider session={session}>
          {!session && <Link href="/api/auth/signin">Sign In</Link>}
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
