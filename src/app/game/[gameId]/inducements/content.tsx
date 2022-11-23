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
  gameId: string;
};

export default function Content(props: Props): ReactElement {
  const [homeInducements, awayInducements] = props.inducements;

  const [choices, setChoices] = useState({
    home: new Map<string, { cost: number; count: number } | Map<string, { cost: number; count: number }>>(),
    away: new Map<string, { cost: number; count: number } | Map<string, { cost: number; count: number }>>(),
  });

  const [result, setResult] = useState<Awaited<ReturnType<typeof trpc.game.purchaseInducements.mutate>> | null>(null);

  const submit = (): void => {
    const flattenChoices = (from: typeof choices['home' | 'away']): SelectInducementsParams =>
      Array.from(from.entries())
        .flatMap(([inducement, quantityOrOptions]) => {
          if ('count' in quantityOrOptions)
            return { name: inducement, quantity: quantityOrOptions.count };
          return Array.from(quantityOrOptions.entries()).map(([opt, { count }]) => ({
            name: inducement,
            option: opt,
            quantity: count,
          }));
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
      if (options.option !== undefined) {
        const map2 = map.get(options.inducement);
        if (map2 === undefined)
          map.set(options.inducement, new Map([[options.option, newValue]]));
        else if ('set' in map2)
          map2.set(options.option, newValue);
      } else {
        map.set(options.inducement, newValue);
      }
      return { ...old, [options.team]: map };
    });
  };

  const calculateTotalCost = (from: typeof choices['home' | 'away']): number =>
    Array.from(from.values())
      .reduce((total, current) => ('cost' in current
        ? total + current.cost
        : Array.from(current.values()).reduce((p, c) => p + c.cost, 0)), 0);

  const entries = Array.from(choices.home.entries());
  const mappedEntries = entries.map(([k, v]) => {
    if ('get' in v)
      return [k, Object.fromEntries(v.entries())];
    return [k, v];
  }) as Array<[string, { count: number; cost: number } | Record<string, { count: number; cost: number }>]>;
  const choicesAsObj = Object.fromEntries(mappedEntries);

  if (result !== null)
    return <>Now let&apos;s <Link href={`/game/${props.gameId}/inprogress`}>Play!</Link></>;

  return <div style={{ display: 'flex' }}>
    <div>
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
    <pre>{JSON.stringify(choicesAsObj, null, 2)}</pre>
    <div>
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
