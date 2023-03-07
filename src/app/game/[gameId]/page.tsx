import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { prisma } from 'utils/prisma';

export default async function Game({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactNode> {
  const game = await prisma.game.findUnique({ where: { id: decodeURIComponent(gameId) }, include: { MVPs: true } });
  if (!game)
    return notFound();

  if (game.state !== 'Complete')
    redirect(`/game/${gameId}/${game.state.toLowerCase()}`);

  const [homeMVP, awayMVP] = [game.homeTeamName, game.awayTeamName]
    .map(team => game.MVPs.find(p => [p.playerTeamName, p.journeymanTeamName].includes(team)));

  return <div>
    Score:
    <span>{game.touchdownsHome} - {game.touchdownsAway}</span>
    <br/>
    Casualties:
    <span>{game.casualtiesHome} - {game.casualtiesAway}</span>
    <br/>
    MVPs:
    <br/>
    <span>Home: {homeMVP?.name ?? homeMVP?.number ?? 'None'}</span>
    <br/>
    <span>Away: {awayMVP?.name ?? awayMVP?.number ?? 'None'}</span>
  </div>;
}
