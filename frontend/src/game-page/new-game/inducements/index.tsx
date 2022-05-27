import React from 'react';
import { NumberInput } from '../../../number-input';
import { gameContext } from '../game-context';
import type { InducementFragment } from '../queries/inducements.query.gen';
import { useInducementsQuery } from '../queries/inducements.query.gen';
import { OptionsList } from './options-list';

function sum(numbers: number[]): number {
  return numbers.reduce((total, current) => total + current, 0);
}

type InducementPrices = {
  specialPrices?: Array<{
    rule: string;
    price: number;
  }> | null | undefined;
  price?: number | null | undefined;
};

function inducementPrice(
  inducement: InducementPrices,
  specialRules: string[]
): number {
  let { price } = inducement;
  if ('specialPrices' in inducement) {
    const specialPrice = inducement.specialPrices?.find(({ rule }) => specialRules.includes(rule))?.price;
    if (specialPrice !== undefined) price = specialPrice;
  }
  return price ?? 0;
}

type SelectedInducementsType =
  & Record<keyof Omit<InducementFragment, 'basic'>, string[]>
  & { basic: Partial<Record<string, number>>; totalCost: number };

type PregameListProps = {
  specialRules: string[];
  pettyCash: number;
  treasury: number;
  inducements: InducementFragment;
  selected: SelectedInducementsType;
  onSelection: (selection: SelectedInducementsType) => void;
};
function PregameList({
  specialRules,
  pettyCash,
  treasury,
  inducements,
  selected,
  onSelection,
}: PregameListProps): React.ReactElement {
  const [expandedList, setExpandedList] = React.useState('');

  const makeListExpander = React.useCallback((listname: string) =>
    () => {
      setExpandedList(old => (old === listname ? '' : listname));
    }, []);

  const makeSelector = React.useCallback((key: keyof Omit<InducementFragment, 'basic'>) =>
    (option: string, sel: boolean) => {
      const newValue = sel ? [...selected[key], option] : selected[key].filter(n => n !== option);
      const inducement = (inducements[key] as Array<InducementPrices & { name: string }>).find(i => i.name === option);
      const price = inducement ? inducementPrice(inducement, specialRules) : 0;
      onSelection({
        ...selected,
        [key]: newValue,
        totalCost: selected.totalCost + (price * (sel ? 1 : -1)),
      });
    }, [selected, inducements, specialRules, onSelection]);

  const makeValueUpdater = React.useCallback((value: string) =>
    (number: number) => {
      const inducement = inducements.basic.find(i => i.name === value);
      const price = inducement ? inducementPrice(inducement, specialRules) : 0;
      onSelection({
        ...selected,
        basic: {
          ...selected.basic,
          [value]: number,
        },
        totalCost: selected.totalCost - ((selected.basic[value] ?? 0) * price) + (number * price),
      });
    }, [inducements.basic, selected, specialRules, onSelection]);

  const basicCost = sum(Object.entries(selected.basic).map(([key, num]) => {
    const { price, specialPrices } = inducements.basic.find(ind => ind.name === key) ?? {};
    const actualPrice = specialPrices?.find(({ rule }) => specialRules.includes(rule))?.price ?? price ?? 0;
    return actualPrice * (num ?? 0);
  }));
  const starPlayerCost = sum(selected.starPlayers.map(player =>
    inducements.starPlayers.find(p => p.name === player)?.price ?? 0));
  const inducementsCost = basicCost + starPlayerCost;
  const pettyCashCost = Math.min(pettyCash, inducementsCost);
  const treasuryCost = inducementsCost > pettyCashCost ? inducementsCost - pettyCash : 0;

  return (
    <>
      <p>Petty cash - {(pettyCash - pettyCashCost).toLocaleString()} (-{pettyCashCost})</p>
      <p>Treasury - {(treasury - treasuryCost).toLocaleString()} (-{treasuryCost})</p>
      <p>Total Available - {(pettyCash + treasury - inducementsCost).toLocaleString()} (-{inducementsCost})</p>
      <p>Inducements Cost - {inducementsCost.toLocaleString()}</p>
      <ul>
        {inducements.basic.map(inducement => (
          <li key={inducement.name}>
            <NumberInput
              max={inducement.max}
              min={0}
              value={selected.basic[inducement.name] ?? 0}
              label={inducement.name}
              showLabel
              onChange={makeValueUpdater(inducement.name)}
            />
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
    </>
  );
}

const noInducements = { basic: {}, wizards: [], starPlayers: [], totalCost: 0 };
export function Inducements(): React.ReactElement {
  const { gameInfo: { home, away }, dispatch } = React.useContext(gameContext);
  const { isLoading, isError, data } = useInducementsQuery({
    homeSpecialRules: home.specialRules,
    awaySpecialRules: away.specialRules,
  });

  const [selected, setSelected] = React.useState<Record<'home' | 'away', SelectedInducementsType>>({
    home: noInducements,
    away: noInducements,
  });
  const handleSelection = React.useCallback((side: 'home' | 'away') =>
    (selection: SelectedInducementsType) => {
      setSelected(o => ({ ...o, [side]: selection }));
    }, []);

  const handleConfirm = React.useCallback(() => {
    if (!data) return;
    const lookup = (
      selection: SelectedInducementsType,
      inventory: InducementFragment
    ): InducementFragment & { basic: Array<{ count: number }>; totalCost: number } => ({
      basic: inventory.basic
        .filter(basic => (selection.basic[basic.name] ?? 0) > 0)
        .map(i => ({ ...i, count: selection.basic[i.name] ?? 0 })),
      starPlayers: inventory.starPlayers.filter(star => selection.starPlayers.includes(star.name)),
      wizards: inventory.starPlayers.filter(wiz => selection.wizards.includes(wiz.name)),
      totalCost: selection.totalCost,
    });
    dispatch({
      type: 'inducements',
      home: lookup(selected.home, data.homeInducements),
      away: lookup(selected.away, data.awayInducements),
    });
  }, [data, dispatch, selected.away, selected.home]);

  if (isLoading) return <>Loading...</>;
  if (isError || !data) return <>Error</>;

  const pettyCashHome = Math.max(0, away.currentTeamValue - home.currentTeamValue);
  const pettyCashAway = Math.max(0, home.currentTeamValue - away.currentTeamValue);

  return (
    <>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-evenly' }}>
        <section>
          <h1>{home.name}</h1>
          <PregameList
            inducements={data.homeInducements}
            specialRules={home.specialRules}
            pettyCash={pettyCashHome}
            treasury={home.treasury}
            selected={selected.home}
            onSelection={handleSelection('home')}
          />
        </section>
        <section>
          <h1>{away.name}</h1>
          <PregameList
            inducements={data.awayInducements}
            specialRules={away.specialRules}
            pettyCash={pettyCashAway}
            treasury={away.treasury}
            selected={selected.away}
            onSelection={handleSelection('away')}
          />
        </section>
      </div>
      <button type="button" onClick={handleConfirm}>Done with inducements</button>
    </>
  );
}
