import type { ReactElement } from 'react';
import { prisma } from 'utils/prisma';
import Content from './content';

type Props = { params: { teamName: string } };

export async function generateStaticParams(): Promise<Array<{ teamName: string }>> {
  const teams = await prisma.team.findMany({ select: { name: true } });
  return teams.map(t => ({ teamName: t.name }));
}

export const dynamicParams = false;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchTeam(teamName: string) {
  return prisma.team.findUniqueOrThrow({
    where: { name: teamName },
    include: {
      roster: { include: { positions: true } },
      players: { include: { skills: true, position: true } },
      journeymen: { include: { skills: true, position: true } },
    },
  });
}
export type FetchedTeamType = Awaited<ReturnType<typeof fetchTeam>>;

export default async function TeamPage({ params: { teamName } }: Props): Promise<ReactElement> {
  const team = await fetchTeam(decodeURIComponent(teamName));
  const skills = await prisma.skill.findMany({});

  return <Content team={team} skills={skills} />;
}
