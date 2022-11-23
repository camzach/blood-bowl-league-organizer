'use client';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { trpc } from 'utils/trpc';
import InducementSelector from './inducement-selector';

type InducementsResponseType = Awaited<ReturnType<typeof trpc.inducements.list.query>>;

type SelectInducementsParams = Parameters<typeof trpc.game.purchaseInducements.mutate>[0]['home' | 'away'];

type Props = {
  inducements: [InducementsResponseType, InducementsResponseType];
  pettyCash: [number, number];
  treasury: [number, number];
  gameId: string;
};

export default function Content(props: Props): ReactElement {
  const [homeInducements, awayInducements] = props.inducements;
  const [homePettyCash, awayPettyCash] = props.pettyCash;
  const [homeTreasury, awayTreasury] = props.treasury;

  const [choices, setChoices] = useState({
    home: new Map<string, { cost: number; count: number }>(),
    away: new Map<string, { cost: number; count: number }>(),
  });

  const [result, setResult] = useState<Awaited<ReturnType<typeof trpc.game.purchaseInducements.mutate>> | null>(null);

  const submit = (): void => {
    const flattenChoices = (from: typeof choices['home' | 'away']): SelectInducementsParams =>
      Array.from(from.entries())
        .map(([key, value]) => {
          const [inducement, option] = key.split('--');
          return {
            name: inducement,
            option,
            quantity: value.count,
          };
        })
        .filter(({ quantity }) => quantity > 0);
    void trpc.game.purchaseInducements.mutate({
      game: props.gameId,
      home: flattenChoices(choices.home),
      away: flattenChoices(choices.away),
    }).then(setResult);
  };

  const handleChoicesUpdate = (options: {
    team: 'home' | 'away';
    inducement: string;
    option?: string;
    quantity: number;
    price: number;
  }): void => {
    setChoices(old => {
      const map = choices[options.team];
      const cost = options.quantity * options.price;
      const newValue = { cost, count: options.quantity };
      const key = [options.inducement, options.option].filter(Boolean).join('--');
      return { ...old, [options.team]: map.set(key, newValue) };
    });
  };

  const calculateTotalCost = (from: typeof choices['home' | 'away']): number =>
    Array.from(from.values())
      .reduce((total, current) => total + current.cost, 0);

  if (result !== null)
    return <>Now let&apos;s <Link href={`/game/${props.gameId}/inprogress`}>Play!</Link></>;

  return <div style={{ display: 'flex' }}>
    <div>
      petty cash: {Math.max(0, homePettyCash - calculateTotalCost(choices.home))}
      <br/>
      treasury: {homeTreasury - Math.max(0, calculateTotalCost(choices.home) - homePettyCash)}
      <br/>
      total cost: {calculateTotalCost(choices.home)}
      <InducementSelector
        options={homeInducements}
        choices={choices.home}
        onUpdate={(options): void => {
          handleChoicesUpdate({ ...options, team: 'home' });
        }}
      />
    </div>
    <button onClick={submit}>Done :)</button>
    <div>
      petty cash: {Math.max(0, awayPettyCash - calculateTotalCost(choices.away))}
      <br/>
      treasury: {awayTreasury - Math.max(0, calculateTotalCost(choices.away) - awayPettyCash)}
      <br/>
      total cost: {calculateTotalCost(choices.away)}
      <InducementSelector
        options={awayInducements}
        choices={choices.away}
        onUpdate={(options): void => {
          handleChoicesUpdate({ ...options, team: 'away' });
        }}
      />
    </div>
  </div>;
}
