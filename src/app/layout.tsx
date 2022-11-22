import type { PropsWithChildren, ReactNode } from 'react';

export default function RootLayout({ children }: PropsWithChildren): ReactNode {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
