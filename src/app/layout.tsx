import SessionProvider from "components/session-provider-client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "pages/api/auth/[...nextauth]";
import type { PropsWithChildren } from "react";
import PasswordChangeNotif from "./password-changer";
import "./global.css";
import type { Metadata } from "next";
import Tooltip from "components/tooltip";
import { cookies } from "next/headers";
import { prisma } from "utils/prisma";
import SeasonPicker from "./season-picker";

export const metadata: Metadata = {
  title: { template: "%s | BBLO", absolute: "BBLO" },
  description: "Blood Bowl League Organizer",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const session = await getServerSession(authOptions);
  const seasons = await prisma.season.findMany({ select: { name: true } });

  const season = cookies().get("season")?.value ?? seasons[0].name;

  return (
    <html data-theme="dark">
      <body>
        <header className="navbar bg-primary text-primary-content">
          <h1 className="m-0 inline-block w-min text-4xl">BBLO</h1>
          <nav className="ml-8 flex gap-8">
            <Link className="text-2xl" href={`/team/${session?.user.teams[0]}`}>
              Teams
            </Link>
            <Link
              className="text-2xl"
              href={`/${encodeURIComponent(season)}/schedule`}
            >
              Schedule
            </Link>
            <Link
              className="text-2xl"
              href={`/${encodeURIComponent(season)}/league-table`}
            >
              League Table
            </Link>
            <Link
              className="text-2xl"
              href={`/${encodeURIComponent(season)}/playoffs`}
            >
              Playoffs
            </Link>
          </nav>
          <span className="ml-auto">
            <SeasonPicker seasons={seasons.map((s) => s.name)} />
          </span>
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
