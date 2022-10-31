'use client';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { trpc } from '../../../../utils/trpc';

export default async function Journeymen(): Promise<ReactNode> {
  const router = useRouter();
  const { gameId } = router.query;
  const data = await trpc.game.get.query(gameId as string);

  if (data.state !== 'Journeymen')
    return <>Bad</>;

  return (
    <div>
      <h1>
        {data.homeTeam} Choices
      </h1>
      {data.homeChoices.map(choice => (
        <label key={choice.id}>
          <input type="radio" name="home" />
          {choice.name}
        </label>
      ))}
      <h1>
        {data.awayTeam} Choices
      </h1>
      {data.awayChoices.map(choice => (
        <label key={choice.id}>
          <input type="radio" name="away" />
          {choice.name}
        </label>
      ))}
    </div>
  );
}
