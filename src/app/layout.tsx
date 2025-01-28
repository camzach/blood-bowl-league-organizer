import { PropsWithChildren } from "react";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
