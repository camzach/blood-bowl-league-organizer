import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { trpc } from 'utils/trpc';

export default async function Journeymen({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactNode> {
  const game = await trpc.game.get.query(gameId);

  if (game.state !== 'Journeymen')
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  return (
    <>
      <h1>
        {game.homeTeam} - Need {game.homeChoices.count} Journeymen
      </h1>
      {game.homeChoices.choices.map(choice => (
        <label key={choice.id}>
          <input type="radio" name="home" />
          {choice.name}
        </label>
      ))}
      <h1>
        {game.awayTeam} - Need {game.awayChoices.count} Journeymen
      </h1>
      {game.awayChoices.choices.map(choice => (
        <label key={choice.id}>
          <input type="radio" name="away" />
          {choice.name}
        </label>
      ))}
      <button>Submit!</button>
    </>
  );
}
