import Link from "next/link";
import type { PropsWithChildren } from "react";
import drizzle from "utils/drizzle"

export default async function TeamLayout({ children }: PropsWithChildren) {
  const teams = await drizzle.query.team.findMany({ columns: { name: true } });
  return (
    <>
      <div className="flex gap-4">
        <ul className="menu min-w-[200px] max-w-fit">
          {teams
            .sort(({ name: a }, { name: b }) => a.localeCompare(b))
            .map((team) => (
              <li key={team.name}>
                <Link className="link" href={`/team/${team.name}`}>
                  {team.name}
                </Link>
              </li>
            ))}
        </ul>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
