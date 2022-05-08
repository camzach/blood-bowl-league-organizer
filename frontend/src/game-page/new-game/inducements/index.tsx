import React from 'react';
import type { SelectedInducementsType } from '..';
import type { InducementFragment } from '../queries/inducements.query.gen';
import { useInducementsQuery } from '../queries/inducements.query.gen';
import type { PregameFragment } from '../queries/team-values.query.gen';
import { OptionsList } from './options-list';

function sum(numbers: number[]): number {
  return numbers.reduce((total, current) => total + current, 0);
}

function inducementPrice(
  inducement: InducementFragment[keyof InducementFragment][number],
  specialRules: string[]
): number {
  let { price } = inducement;
  if ('specialPrices' in inducement) {
    const specialPrice = inducement.specialPrices?.find(({ rule }) => specialRules.includes(rule))?.price;
    if (specialPrice !== undefined) price = specialPrice;
  }
  return price ?? 0;
}

type PregameListProps = {
  teamInfo: PregameFragment;
  opponentInfo: PregameFragment;
  inducements: InducementFragment;
  selected: SelectedInducementsType;
  onSelection: (selection: SelectedInducementsType) => void;
};
function PregameList(props: PregameListProps): React.ReactElement {
  const { teamInfo, opponentInfo, inducements, selected, onSelection } = props;

  const [expandedList, setExpandedList] = React.useState('');
  const id = React.useId();

  const makeListExpander = React.useCallback((listname: string) =>
    () => {
      setExpandedList(old => (old === listname ? '' : listname));
    }, []);

  const makeSelector = React.useCallback((key: keyof Omit<InducementFragment, 'basic'>) =>
    (option: string, sel: boolean) => {
      const newValue = sel ? [...selected[key], option] : selected[key].filter(n => n !== option);
      const inducement = inducements[key].find(i => i.name === option);
      const price = inducement ? inducementPrice(inducement, teamInfo.specialRules) : 0;
      onSelection({
        ...selected,
        [key]: newValue,
        totalCost: selected.totalCost + (price * (sel ? 1 : -1)),
      });
    }, [selected, inducements, teamInfo.specialRules, onSelection]);

  const makeValueUpdater = React.useCallback((value: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inducement = inducements.basic.find(i => i.name === value);
      const price = inducement ? inducementPrice(inducement, teamInfo.specialRules) : 0;
      onSelection({
        ...selected,
        basic: {
          ...selected.basic,
          [value]: e.target.valueAsNumber,
        },
        totalCost: selected.totalCost - ((selected.basic[value] ?? 0) * price) + (e.target.valueAsNumber * price),
      });
    }, [inducements.basic, onSelection, selected, teamInfo.specialRules]);

  const pettyCash = Math.max(0, opponentInfo.teamValue.current - teamInfo.teamValue.current);

  const basicCost = sum(Object.entries(selected.basic).map(([key, num]) => {
    const { price, specialPrices } = inducements.basic.find(ind => ind.name === key) ?? {};
    const actualPrice = specialPrices?.find(({ rule }) => teamInfo.specialRules.includes(rule))?.price ?? price ?? 0;
    return actualPrice * (num ?? 0);
  }));
  const starPlayerCost = sum(selected.starPlayers.map(player =>
    inducements.starPlayers.find(p => p.name === player)?.price ?? 0));
  const inducementsCost = basicCost + starPlayerCost;
  const pettyCashCost = Math.min(pettyCash, inducementsCost);
  const treasuryCost = inducementsCost > pettyCashCost ? inducementsCost - pettyCash : 0;

  return (
    <section>
      <h1>{teamInfo.name}</h1>
      <p>Petty cash - {(pettyCash - pettyCashCost).toLocaleString()} (-{pettyCashCost})</p>
      <p>Treasury - {(teamInfo.treasury - treasuryCost).toLocaleString()} (-{treasuryCost})</p>
      <p>Total Available - {(pettyCash + teamInfo.treasury - inducementsCost).toLocaleString()} (-{inducementsCost})</p>
      <p>Inducements Cost - {inducementsCost.toLocaleString()}</p>
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
    </section>
  );
}

type ResultType = { home: SelectedInducementsType; away: SelectedInducementsType };
const noInducements = { basic: {}, wizards: [], starPlayers: [], totalCost: 0 };
type Props = {
  home: PregameFragment;
  away: PregameFragment;
  onResult: (result: ResultType) => void;
};

export function Inducements({ home, away, onResult }: Props): React.ReactElement {
  const { isLoading, isError, data } = useInducementsQuery({
    homeSpecialRules: home.specialRules,
    awaySpecialRules: away.specialRules,
  });

  const [selected, setSelected] = React.useState<ResultType>({ home: noInducements, away: noInducements });
  const handleSelection = React.useCallback((side: keyof ResultType) => (selection: SelectedInducementsType) => {
    setSelected(o => ({ ...o, [side]: selection }));
  }, []);
  const handleConfirm = React.useCallback(() => {
    onResult(selected);
  }, [onResult, selected]);

  if (isLoading) return <>Loading...</>;
  if (isError || !data) return <>Error</>;

  return (
    <>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-evenly' }}>
        <PregameList
          inducements={data.homeInducements}
          opponentInfo={away}
          selected={selected.home}
          teamInfo={home}
          onSelection={handleSelection('home')}
        />
        <PregameList
          inducements={data.awayInducements}
          opponentInfo={home}
          selected={selected.away}
          teamInfo={away}
          onSelection={handleSelection('away')}
        />
      </div>
      <button type="button" onClick={handleConfirm}>Done with inducements</button>
    </>
  );
}
