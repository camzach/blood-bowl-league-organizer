import SessionProvider from "components/session-provider-client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "pages/api/auth/[...nextauth]";
import type { PropsWithChildren, ReactElement } from "react";
import PasswordChangeNotif from "./password-change-notif";
import "./global.css";
import type { Metadata } from "next";
import Tooltip from "components/tooltip";

export const metadata: Metadata = {
  title: { template: "%s | BBLO", absolute: "BBLO" },
  description: "Blood Bowl League Organizer",
};

export default async function RootLayout({
  children,
}: PropsWithChildren): Promise<ReactElement> {
  const session = await getServerSession(authOptions);

  return (
    <html data-theme="dark">
      <body>
        <header className="navbar bg-primary text-primary-content">
          <h1 className="m-0 inline-block w-min text-4xl">BBLO</h1>
          <nav className="ml-8 flex gap-8">
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
          <main className="p-4">{children}</main>
        </SessionProvider>
        <Tooltip />
      </body>
    </html>
  );
}
