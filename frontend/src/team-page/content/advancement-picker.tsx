import React from 'react';
import { Spinner } from '../../game-page/new-game/spinner';
import type { SkillsQuery } from './skills.query.gen';
import { useSkillsQuery } from './skills.query.gen';
import type { TeamQuery } from './team.query.gen';

export const advancementCosts = {
  'Random Primary': [3, 4, 6, 8, 10, 15],
  'Chosen Primary': [6, 8, 12, 16, 20, 30],
  'Random Secondary': [6, 8, 12, 16, 20, 30],
  'Chosen Secondary': [12, 14, 18, 22, 26, 40],
  'Characteristic Improvement': [18, 20, 24, 28, 32, 50],
} as const;

const skillConflicts: Partial<Record<string, string[]>> = {
  'No Hands': ['Catch', 'Diving Catch', 'Safe Pair of Hands'],
  'Frenzy': ['Grab'],
  'Grab': ['Frenzy'],
  'Leap': ['Pogo Stick'],
  'Pogo Stick': ['Leap'],
  'Ball & Chain': ['Grab', 'Leap', 'Multiple Block', 'On the Ball', 'Shadowing'],
};

function getDisabledSkills(skills: string[]): string[] {
  return skills.flatMap(s => [s, ...skillConflicts[s] ?? []]);
}

type SkillCategory = SkillsQuery['skills'][number]['category'];
type Props = {
  player: NonNullable<TeamQuery['team']>['players'][number];
  rosterPlayer: NonNullable<TeamQuery['team']>['race']['players'][number];
  onAdvancementChosen: (playerId: string, option: string) => void;
  onCancel: () => void;
};
export function AdvancementPicker({
  player,
  rosterPlayer,
  onAdvancementChosen,
  onCancel,
}: Props): React.ReactElement {
  const { isLoading, isError, data } = useSkillsQuery();
  const [type, setType] = React.useState<keyof typeof advancementCosts>(() => {
    const opts = Object.keys(advancementCosts) as Array<keyof typeof advancementCosts>;
    const result = opts.find(key => advancementCosts[key].some(cost => cost <= player.starPlayerPoints.current));
    return result ?? 'Random Primary';
  });
  const handleTypeChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as keyof typeof advancementCosts);
  }, []);
  const [randomCategory, setRandomCategory] = React.useState<string | null>(null);
  const handleCategorySelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRandomCategory(e.target.value as SkillCategory);
  }, []);
  const [selection, setSelection] = React.useState<string | null>(null);
  const handleSelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelection(e.target.value);
  }, []);
  const disabledSkills = getDisabledSkills([...player.skills.map(s => s.name)]);
  const handleConfirm = React.useCallback(() => {
    if (selection === null) return;
    onAdvancementChosen(player.id, selection);
  }, [selection, player.id, onAdvancementChosen]);

  if (isLoading) return <>Loading skills...</>;
  if (isError || !data) return <>Error fetching skills</>;

  const selectedCategories = (type.endsWith('Primary') ? rosterPlayer.primary : rosterPlayer.secondary);

  return (
    <>
      {`#${player.number} - ${player.name ?? ''}`}
      <ol>
        {player.progression.map((p, idx) => (
          <li key={p}>{p} - {advancementCosts[p as keyof typeof advancementCosts][idx]}</li>
        ))}
      </ol>
      <select disabled={selection !== null} value={type} onChange={handleTypeChange}>
        {Object.entries(advancementCosts)
          .filter(([, costs]) => costs[player.progression.length] <= player.starPlayerPoints.current)
          .map(([adv, costs]) => (
            <option key={adv} value={adv}>
              {adv} - {costs[player.progression.length]}
            </option>
          ))}
      </select>
      {type.startsWith('Chosen') &&
        <select onChange={handleSelect}>
          {data.skills
            .filter(s =>
              selectedCategories.includes(s.category) &&
              !player.skills.some(other => s.name === other.name))
            .map(s => (
              <option key={s.name}>
                {s.name.replace('$$', '1')}
              </option>))}
        </select>}
      {type.startsWith('Random') &&
        <>
          <select disabled={selection !== null} value={randomCategory ?? undefined} onChange={handleCategorySelect}>
            {selectedCategories.map(category => (
              <option key={category}>
                {category}
              </option>
            ))}
          </select>
          <Spinner
            isSingleSpin
            fields={data.skills
              .filter(s =>
                (s.category === (randomCategory ?? selectedCategories[0])) &&
                (!disabledSkills.includes(s.name)))
              .map((s, idx, arr) => ({
                text: s.name.replace('$$', '1'),
                prob: 1 / arr.length,
                color: `hsl(${360 * idx / arr.length} 100% 50%)`,
              }))}
            onResult={setSelection}
          />
        </>}
      {type === 'Characteristic Improvement' &&
        <>
          <Spinner
            isSingleSpin
            fields={[
              { text: 'MA / AV', prob: 7 / 16, color: 'red' },
              { text: 'MA / AV / PA', prob: 6 / 16, color: 'orange' },
              { text: 'AG / PA', prob: 1 / 16, color: 'yellow' },
              { text: 'ST / AG', prob: 1 / 16, color: 'green' },
              { text: 'Your Choice', prob: 1 / 16, color: 'blue' },
            ]}
            onResult={setRandomCategory}
          />
          {((): React.ReactElement => {
            const options = randomCategory === 'Your Choice'
              ? ['MA', 'AV', 'PA', 'AG', 'ST']
              : randomCategory?.split(' / ') ?? [];
            return (
              <div>
                <select value={selection ?? ''} onChange={handleSelect}>
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
                <button
                  type="button"
                  // eslint-disable-next-line react/jsx-no-bind
                  onClick={(): void => { setType('Chosen Secondary'); }}
                >
                  Pick a Secondary
                </button>
              </div>
            );
          })()}
        </>}
      <br />
      <button type="button" disabled={selection === null} onClick={handleConfirm}>Commit</button>
      <button type="button" disabled={selection !== null} onClick={onCancel}>Cancel</button>
    </>
  );
}
