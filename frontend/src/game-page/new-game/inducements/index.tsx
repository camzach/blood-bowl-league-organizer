import React from 'react';
import type { InducementFragment } from './inducements.query.gen';
import { useInducementsQuery } from './inducements.query.gen';
import type { PregameFragment } from '../team-values.query.gen';
import { OptionsList } from './options-list';

function sum(numbers: number[]): number {
  return numbers.reduce((total, current) => total + current, 0);
}

type PregameListProps = {
  teamInfo: PregameFragment;
  opponentInfo: PregameFragment;
  inducements: InducementFragment;
};
function PregameList(props: PregameListProps): React.ReactElement {
  const { teamInfo, opponentInfo, inducements } = props;
  type SelectedType = Record<keyof Omit<InducementFragment, 'basic'>, string[]> & { basic: Record<string, number> };
  const [selected, setSelected] = React.useState<SelectedType>({
    basic: {},
    starPlayers: [],
    wizards: [],
  });
  const [expandedList, setExpandedList] = React.useState('');
  const id = React.useId();

  const makeListExpander = React.useCallback((listname: string) =>
    () => {
      setExpandedList(old => (old === listname ? '' : listname));
    }, []);

  const makeSelector = React.useCallback((key: keyof Omit<InducementFragment, 'basic'>) =>
    (option: string, sel: boolean) => {
      setSelected(old => {
        const newValue = sel ? [...old[key], option] : old[key].filter(n => n !== option);
        return {
          ...old,
          [key]: newValue,
        };
      });
    }, []);

  const makeValueUpdater = React.useCallback((value: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelected(old => ({
        ...old,
        basic: {
          ...old.basic,
          [value]: e.target.valueAsNumber,
        },
      }));
    }, []);

  const pettyCash = Math.max(0, opponentInfo.teamValue.current - teamInfo.teamValue.current);
  const prayersToNuffle = Math.floor(Math.max(
    0,
    (opponentInfo.teamValue.current - teamInfo.teamValue.current) / 50000
  ));

  const basicCost = sum(Object.entries(selected.basic).map(([key, num]) => {
    const price = inducements.basic.find(ind => ind.name === key)?.price ?? 0;
    return price * num;
  }));
  const starPlayerCost = sum(selected.starPlayers.map(player =>
    inducements.starPlayers.find(p => p.name === player)?.price ?? 0));
  const inducementsCost = basicCost + starPlayerCost;
  const pettyCashCost = Math.min(pettyCash, inducementsCost);
  const treasuryCost = inducementsCost > pettyCashCost ? inducementsCost - pettyCash : 0;

  return (
    <article>
      <h2>{teamInfo.name}</h2>
      <p>Petty cash - {(pettyCash - pettyCashCost).toLocaleString()} (-{pettyCashCost})</p>
      <p>Treasury - {(teamInfo.treasury - treasuryCost).toLocaleString()} (-{treasuryCost})</p>
      <p>Total Available - {(pettyCash + teamInfo.treasury - inducementsCost).toLocaleString()} (-{inducementsCost})</p>
      <p>Inducements Cost - {inducementsCost.toLocaleString()}</p>
      <p>Prayers to Nuffle - {prayersToNuffle}</p>
      <ul>
        {inducements.basic.map(inducement => (
          <li key={inducement.name}>
            <label htmlFor={id}>
              <input
                defaultValue={0}
                id={id}
                max={inducement.max}
                min={0}
                type="number"
                value={selected.basic.size}
                onChange={makeValueUpdater(inducement.name)}
              />
              {inducement.name}
            </label>
          </li>
        ))}
        <li>
          <OptionsList
            isOpen={expandedList === 'starPlayers'}
            maxSelected={2}
            options={inducements.starPlayers}
            selected={selected.starPlayers}
            onToggleExpand={makeListExpander('starPlayers')}
            onToggleOption={makeSelector('starPlayers')}
          />
        </li>
      </ul>
    </article>
  );
}

type Props = {
  home: PregameFragment;
  away: PregameFragment;
};

export function Inducements({ home, away }: Props): React.ReactElement {
  const { isLoading, isError, data } = useInducementsQuery({
    homeSpecialRules: home.specialRules,
    awaySpecialRules: away.specialRules,
  });

  if (isLoading) return <>Loading...</>;
  if (isError || !data) return <>Error</>;

  return (
    <>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-evenly' }}>
        <PregameList
          inducements={data.homeInducements}
          opponentInfo={away}
          teamInfo={home}
        />
        <PregameList
          inducements={data.awayInducements}
          opponentInfo={home}
          teamInfo={away}
        />
      </div>
      <button type="button">Done with inducements</button>
    </>
  );
}
