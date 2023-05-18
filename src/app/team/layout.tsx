import Link from "next/link";
import type { PropsWithChildren } from "react";
import { prisma } from "utils/prisma";

export default async function TeamLayout({ children }: PropsWithChildren) {
  const teams = await prisma.team.findMany({ select: { name: true } });

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
