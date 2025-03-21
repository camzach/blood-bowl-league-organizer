import { PropsWithChildren } from "react";
import "./global.css";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
