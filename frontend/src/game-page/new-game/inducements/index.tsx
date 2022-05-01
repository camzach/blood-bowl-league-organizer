import React from 'react';
import type { InducementFragment } from './inducements.query.gen';
import { useInducementsQuery } from './inducements.query.gen';
import type { PregameFragment } from '../team-values.query.gen';

// eslint-disable-next-line max-params
function renderSublist(
  choices: InducementFragment['choices'],
  max: number,
  selected: Set<string>,
  onSelect: (name: string, checked: boolean) => void,
): React.ReactElement {
  const handleSelect = (choice: string) => (e: React.ChangeEvent<HTMLInputElement>): void => {
    onSelect(choice, e.target.checked);
  };
  // eslint-disable-next-line no-underscore-dangle
  switch (choices?.__typename) {
    case 'StarPlayerOptions':
      return (
        <ul>
          {choices.starPlayers.map(choice => (
            <li key={choice.name}>
              <input
                checked={selected.has(choice.name)}
                disabled={selected.size >= max && !selected.has(choice.name)}
                type="checkbox"
                onChange={handleSelect(choice.name)}
              />
              {choice.name}
            </li>
          ))}
        </ul>
      );
    default: return <> </>;
  }
}

type PregameListProps = {
  teamInfo: PregameFragment;
  opponentInfo: PregameFragment;
  inducements: InducementFragment[];
};
function PregameList(props: PregameListProps): React.ReactElement {
  const { teamInfo, opponentInfo, inducements } = props;

  const [selected, setSelected] = React.useState<Record<string, Set<string> | number>>(() => {
    const entries = inducements
      .map(({ name: n, choices }) => (choices ? [n, new Set()] : [n, 0]) as [string, Set<string> | number]);
    return Object.fromEntries(entries);
  });

  const pettyCash = Math.max(0, opponentInfo.teamValue.current - teamInfo.teamValue.current);
  const prayersToNuffle = Math.floor(Math.max(
    0,
    (opponentInfo.teamValue.current - teamInfo.teamValue.current) / 50000
  ));
  return (
    <div>
      <h2>{teamInfo.name}</h2>
      <p>Petty cash - {pettyCash.toLocaleString()}</p>
      <p>Treasury - {teamInfo.treasury.toLocaleString()}</p>
      <p>Total Available - {(pettyCash + teamInfo.treasury).toLocaleString()}</p>
      <p>Prayers to Nuffle - {prayersToNuffle}</p>
      <ul>
        {inducements.map(inducement => (
          <li key={inducement.name}>
            {!inducement.choices &&
              <input
                defaultValue={0}
                max={inducement.max}
                min={0}
                type="number"
              />}
            {inducement.name}
            {inducement.choices && renderSublist(
              inducement.choices,
              inducement.max,
              selected[inducement.name] as Set<string>,
              (n, checked) => {
                setSelected(old => {
                  let newValue = old[inducement.name];
                  if (typeof newValue === 'number') newValue += Number(checked);
                  else if (checked) newValue.add(n);
                  else newValue.delete(n);
                  return { ...old, [inducement.name]: newValue };
                });
              }
            )}
          </li>
        ))}
      </ul>
    </div>
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
  );
}
