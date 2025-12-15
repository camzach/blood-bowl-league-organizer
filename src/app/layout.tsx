import { PropsWithChildren } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./global.css";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <NuqsAdapter>
      <html data-theme="dark">
        <body>{children}</body>
      </html>
    </NuqsAdapter>
  );
}
