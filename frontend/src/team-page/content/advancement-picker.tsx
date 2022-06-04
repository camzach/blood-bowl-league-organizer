import React from 'react';
import type { SkillCategory } from '../../graphql.gen';
import { CharacteristicImprovementPreference } from '../../graphql.gen';
import type {
  CharacteristicImprovementMutation,
  CharacteristicImprovementMutationVariables,
  ChosenSkillMutation,
  ChosenSkillMutationVariables,
  RandomSkillMutation,
  RandomSkillMutationVariables,
} from './advancements.mutation.gen';
import {
  CharacteristicImprovementDocument,
  ChosenSkillDocument,
  RandomSkillDocument,
} from './advancements.mutation.gen';
import type { SkillsQuery } from './skills.query.gen';
import { useSkillsQuery } from './skills.query.gen';
import type { TeamPagePlayerFragment, TeamQuery } from './team.query.gen';

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

async function runMutation<Data>(query: string, variables: Record<string, unknown>): Promise<Data> {
  const res = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json() as { data: Data; errors?: unknown[] };
  if ((data.errors?.length ?? 0) > 0) throw new Error('Failed fetch');
  return data.data;
}

type Props = {
  player: NonNullable<TeamQuery['team']>['players'][number];
  rosterPlayer: NonNullable<TeamQuery['team']>['race']['players'][number];
  onAdvancementChosen: (updatedPlayer: TeamPagePlayerFragment) => void;
};
export function AdvancementPicker({
  player,
  rosterPlayer,
  onAdvancementChosen,
}: Props): React.ReactElement {
  const { isLoading, isError, data } = useSkillsQuery();
  const disabledSkills = getDisabledSkills([...player.skills.map(s => s.name)]);
  const isSkillSelectable = React.useCallback(
    (category: SkillCategory) =>
      (skill: NonNullable<SkillsQuery>['skills'][number]): boolean =>
        skill.category === category &&
      !disabledSkills.includes(skill.name) &&
      !player.skills.some(s => s.name === skill.name)
    , [disabledSkills, player.skills]
  );
  const isCharacteristicSelectable = React.useCallback((stat: keyof typeof player.stats | 'Secondary') => {
    if (stat === 'Secondary') return true;
    const maxStats = { MA: 9, ST: 8, PA: 6, AG: 6, AV: 11 };
    const minStats = { MA: 1, ST: 1, PA: 1, AG: 1, AV: 3 };
    const improvedStat = ['AV', 'ST', 'MA'].includes(stat)
      ? player.stats[stat] ?? minStats[stat] + 1
      : (player.stats[stat] ?? maxStats[stat]) - 1;
    const inBounds = (improvedStat > minStats[stat] && improvedStat < maxStats[stat]);
    const improvements = player.progression.filter(p => p === stat).length;
    return inBounds && improvements < 2;
  }, [player]);
  const getAvailableCategories = React.useCallback((t: keyof typeof advancementCosts): SkillCategory[] | null => {
    if (t === 'Characteristic Improvement') return null;
    return t.endsWith('Primary') ? rosterPlayer.primary : rosterPlayer.secondary;
  }, [rosterPlayer.primary, rosterPlayer.secondary]);
  const [type, setType] = React.useState<keyof typeof advancementCosts>(() => {
    const opts = Object.keys(advancementCosts) as Array<keyof typeof advancementCosts>;
    const result = opts.find(key => advancementCosts[key].some(cost => cost <= player.starPlayerPoints.current));
    return result ?? 'Random Primary';
  });
  const [randomCategory, setRandomCategory] = React.useState<SkillCategory | null>(() =>
    getAvailableCategories(type)?.[0] ?? null);
  const handleCategoryChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRandomCategory(e.target.value as SkillCategory);
  }, []);
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(null);
  const handleTypeChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as keyof typeof advancementCosts);
    const typedValue = e.target.value as keyof typeof advancementCosts;
    const availableCategories = getAvailableCategories(typedValue);
    setRandomCategory(availableCategories?.[0] ?? null);
    setSelectedSkillId(availableCategories
      ? data?.skills.find(isSkillSelectable(availableCategories[0]))?.id ?? null
      : null);
  }, [data?.skills, getAvailableCategories, isSkillSelectable]);
  const handleSkillSelection = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSkillId(e.target.value);
  }, []);
  const [statPrefs, setStatPrefs] = React.useState<CharacteristicImprovementPreference[]>([
    CharacteristicImprovementPreference.Ma,
    CharacteristicImprovementPreference.Ag,
    CharacteristicImprovementPreference.St,
    CharacteristicImprovementPreference.Av,
    CharacteristicImprovementPreference.Pa,
    CharacteristicImprovementPreference.Secondary,
  ]);
  const handleReorder = React.useCallback((dir: 'up' | 'down', idx: number) => () => {
    const other = dir === 'up' ? idx - 1 : idx + 1;
    setStatPrefs(old => {
      const newPrefs = [...old];
      const temp = newPrefs[idx];
      newPrefs[idx] = newPrefs[other];
      newPrefs[other] = temp;
      return newPrefs;
    });
  }, []);
  const handleRandomSkill = React.useCallback(() => {
    if (!randomCategory) return;
    const variables: RandomSkillMutationVariables = { playerId: player.id, category: randomCategory };
    void runMutation<RandomSkillMutation>(RandomSkillDocument, variables).then(({ purchaseRandomSkill }) => {
      const { player: upd } = purchaseRandomSkill;
      onAdvancementChosen(upd);
    });
  }, [onAdvancementChosen, player.id, randomCategory]);
  const handleChosenSkill = React.useCallback(() => {
    if (selectedSkillId === null) return;
    const variables: ChosenSkillMutationVariables = { playerId: player.id, skillId: selectedSkillId };
    void runMutation<ChosenSkillMutation>(ChosenSkillDocument, variables).then(({ purchaseChosenSkill }) => {
      const { player: upd } = purchaseChosenSkill;
      onAdvancementChosen(upd);
    });
  }, [onAdvancementChosen, player.id, selectedSkillId]);
  const handleCharacteristicImprovement = React.useCallback(() => {
    if (selectedSkillId === null) return;
    const variables: CharacteristicImprovementMutationVariables = {
      playerId: player.id,
      secondarySkillChoice: selectedSkillId,
      preferences: statPrefs,
    };
    void runMutation<CharacteristicImprovementMutation>(CharacteristicImprovementDocument, variables)
      .then(({ purchaseCharacteristicImprovement }) => {
        const { player: upd } = purchaseCharacteristicImprovement;
        onAdvancementChosen(upd);
      });
  }, [onAdvancementChosen, player.id, selectedSkillId, statPrefs]);

  if (isLoading) return <>Loading Skills...</>;
  if (!data || isError) return <>Error loading skills</>;

  return (
    <>
      <ol>
        {/* eslint-disable-next-line react/no-array-index-key */}
        {player.progression.map((p, idx) => <li key={`${p}${idx}`}>{p}</li>)}
      </ol>
      <select value={type} onChange={handleTypeChange}>
        {Object.entries(advancementCosts)
          .filter(([, costs]) => costs[player.progression.length] <= player.starPlayerPoints.current)
          .map(([adv, costs]) => (
            <option key={adv} value={adv}>
              {adv} - {costs[player.progression.length]}
            </option>
          ))}
      </select>
      {type.startsWith('Random') &&
        <React.Fragment key={type}>
          <select value={randomCategory ?? undefined} onChange={handleCategoryChange}>
            {getAvailableCategories(type)?.map(category => (
              <option key={category}>
                {category}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleRandomSkill}>Spin!</button>
        </React.Fragment>}
      {type.startsWith('Chosen') && (
        <React.Fragment key={type}>
          <select value={selectedSkillId ?? undefined} onChange={handleSkillSelection}>
            {(getAvailableCategories(type) ?? []).map(category => (
              <optgroup key={category} label={category}>
                {data.skills
                  .filter(isSkillSelectable(category))
                  .map(skill => (
                    <option key={skill.name} value={skill.id}>{skill.name}</option>
                  ))}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={handleChosenSkill}>Confirm</button>
        </React.Fragment>
      )}
      {type === 'Characteristic Improvement' && (
        <React.Fragment key={type}>
          <ol>
            {statPrefs
              .filter(isCharacteristicSelectable)
              .map((c, idx, arr) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={`${c}-${idx}`}>
                  {c}
                  {c === 'Secondary' &&
                  (
                    <select value={selectedSkillId ?? undefined} onChange={handleSkillSelection}>
                      {rosterPlayer.secondary.map(category => (
                        <optgroup key={category} label={category}>
                          {data.skills
                            .filter(isSkillSelectable(category))
                            .map(skill => (
                              <option key={skill.name} value={skill.id}>{skill.name}</option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                  <span>
                    {idx !== 0 && <button type="button" onClick={handleReorder('up', idx)}>Up</button>}
                    {idx !== arr.length - 1 && <button type="button" onClick={handleReorder('down', idx)}>Down</button>}
                  </span>
                </li>
              ))}
          </ol>
          <button type="button" onClick={handleCharacteristicImprovement}>Spin!</button>
        </React.Fragment>
      )}
    </>
  );
}
