import Link from 'components/link';
import type { PropsWithChildren, ReactElement } from 'react';
import { prisma } from 'utils/prisma';

export default async function TeamLayout({ children }: PropsWithChildren): Promise<ReactElement> {
  const teams = await prisma.team.findMany({ select: { name: true } });
  return (
    <>
      <div className="grid grid-cols-[200px_auto]">
        <ul>
          {teams.sort(({ name: a }, { name: b }) => a.localeCompare(b)).map(team => <li key={team.name}>
            <Link href={`/team/${team.name}`}>{team.name}</Link>
          </li>)}
        </ul>
        <main className="m-4">{children}</main>
      </div>
    </>
  );
}
