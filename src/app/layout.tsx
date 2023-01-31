import SessionProvider from 'components/session-provider-client';
import { getServerSession } from 'next-auth';
import type { PropsWithChildren, ReactElement } from 'react';

export default async function RootLayout({ children }: PropsWithChildren): Promise<ReactElement> {
  const session = await getServerSession();
  return (
    <html>
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
