import classNames from "classnames";
import Link from "components/link";
import type { PropsWithChildren, ReactElement } from "react";
import { prisma } from "utils/prisma";

export default async function TeamLayout({
  children,
}: PropsWithChildren): Promise<ReactElement> {
  const teams = await prisma.team.findMany({ select: { name: true } });
  return (
    <>
      <div className="flex gap-4">
        <ul className="min-w-[200px] max-w-fit">
          {teams
            .sort(({ name: a }, { name: b }) => a.localeCompare(b))
            .map((team, i) => (
              <li key={team.name}>
                <Link
                  className={classNames(
                    "block rounded-sm px-3 py-2",
                    i % 2 === 1 && "bg-slate-400"
                  )}
                  href={`/team/${team.name}`}
                >
                  {team.name}
                </Link>
              </li>
            ))}
        </ul>
        {children}
      </div>
    </>
  );
}
