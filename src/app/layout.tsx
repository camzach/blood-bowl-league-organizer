import type { PropsWithChildren, ReactNode } from 'react';

export default function RootLayout({ children }: PropsWithChildren): ReactNode {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
