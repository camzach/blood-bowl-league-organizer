import type { SkillCategory } from '@prisma/client/edge';
import { useRouter } from 'next/navigation';
import React from 'react';
import { trpc } from 'utils/trpc';
import type { FetchedTeamType } from '../page';
import Button from 'components/button';

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

type Props = {
  player: FetchedTeamType['players'][number];
  rosterPlayer: FetchedTeamType['roster']['positions'][number];
  skills: Array<{ name: string; category: string }>;
  onHide: () => void;
};
export function Popup({
  player,
  rosterPlayer,
  skills,
  onHide,
}: Props): React.ReactElement {
  const router = useRouter();

  const disabledSkills = getDisabledSkills([...player.skills.map(s => s.name)]);
  const isSkillSelectable = React.useCallback(
    (category: string) =>
      (skill: { category: string; name: string }): boolean =>
        skill.category === category &&
      !disabledSkills.includes(skill.name) &&
      !player.skills.some(s => s.name === skill.name)
    , [disabledSkills, player.skills]
  );

  const isCharacteristicSelectable = React.useCallback((stat: 'MA' | 'AG' | 'AV' | 'PA' | 'ST' | 'Secondary') => {
    if (stat === 'Secondary') return true;
    const maxStats = { MA: 9, ST: 8, PA: 6, AG: 6, AV: 11 };
    const minStats = { MA: 1, ST: 1, PA: 1, AG: 1, AV: 3 };
    const improvedStat = ['AV', 'ST', 'MA'].includes(stat)
      ? player[stat] ?? minStats[stat] + 1
      : (player[stat] ?? maxStats[stat]) - 1;
    const inBounds = (improvedStat > minStats[stat] && improvedStat < maxStats[stat]);
    const improvements = player[`${stat}Improvements`];
    return inBounds && improvements < 2;
  }, [player]);
  const getAvailableCategories = React.useCallback((t: keyof typeof advancementCosts): SkillCategory[] | null => {
    if (t === 'Characteristic Improvement') return null;
    return t.endsWith('Primary') ? rosterPlayer.primary : rosterPlayer.secondary;
  }, [rosterPlayer.primary, rosterPlayer.secondary]);
  const [type, setType] = React.useState<keyof typeof advancementCosts>(() => {
    const opts = Object.keys(advancementCosts) as Array<keyof typeof advancementCosts>;
    const result = opts.find(key => advancementCosts[key].some(cost => cost <= player.starPlayerPoints));
    return result ?? 'Random Primary';
  });
  const [randomCategory, setRandomCategory] = React.useState<SkillCategory | null>(() =>
    getAvailableCategories(type)?.[0] ?? null);
  const handleCategoryChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRandomCategory(e.target.value as SkillCategory);
  }, []);
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);
  const handleTypeChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as keyof typeof advancementCosts);
    const typedValue = e.target.value as keyof typeof advancementCosts;
    const availableCategories = getAvailableCategories(typedValue);
    setRandomCategory(availableCategories?.[0] ?? null);
    setSelectedSkill(availableCategories
      ? skills.find(isSkillSelectable(availableCategories[0]))?.name ?? null
      : null);
  }, [skills, getAvailableCategories, isSkillSelectable]);
  const handleSkillSelection = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSkill(e.target.value);
  }, []);

  const [statPrefs, setStatPrefs] = React.useState<Array<'MA' | 'AG' | 'ST' | 'AV' | 'PA' | 'Secondary'>>(() => ([
    'MA',
    'AG',
    'ST',
    'AV',
    'PA',
    'Secondary',
  ] as const).filter(stat => isCharacteristicSelectable(stat)));

  const handleReorder = (dir: 'up' | 'down', idx: number) => () => {
    const other = dir === 'up' ? idx - 1 : idx + 1;
    setStatPrefs(old => {
      const newPrefs = [...old];
      const temp = newPrefs[idx];
      newPrefs[idx] = newPrefs[other];
      newPrefs[other] = temp;
      return newPrefs;
    });
  };

  const handleUpgrade = (): void => {
    const update = ((): Parameters<typeof trpc.player.improve.mutate>[0]['update'] => {
      switch (type) {
        case 'Characteristic Improvement': {
          if (selectedSkill === null)
            throw new Error('Skill not selected');
          return {
            type: 'characteristic',
            preferences: statPrefs.slice(0, statPrefs.findIndex(val =>
              val === 'Secondary')) as [Exclude<(typeof statPrefs)[number], 'Secondary'>],
            skill: selectedSkill,
          };
        }
        case 'Chosen Primary': {
          if (selectedSkill === null)
            throw new Error('Skill not selected');
          return {
            type: 'chosen',
            subtype: 'primary',
            skill: selectedSkill,
          };
        }
        case 'Chosen Secondary': {
          if (selectedSkill === null)
            throw new Error('Skill not selected');
          return {
            type: 'chosen',
            subtype: 'secondary',
            skill: selectedSkill,
          };
        }
        case 'Random Primary': {
          if (randomCategory === null)
            throw new Error('Skill not selected');
          return {
            type: 'random',
            subtype: 'primary',
            category: randomCategory,
          };
        }
        case 'Random Secondary': {
          if (randomCategory === null)
            throw new Error('Skill not selected');
          return {
            type: 'random',
            subtype: 'secondary',
            category: randomCategory,
          };
        }
      }
      return 'above switch is exhaustive' as never;
    })();
    void trpc.player.improve.mutate({
      player: player.id,
      update,
    })
      .then(() => {
        router.refresh();
        onHide();
      });
  };

  return (
    <>
      <select value={type} onChange={handleTypeChange}>
        {Object.entries(advancementCosts)
          .map(([adv, costs]) => (
            <option key={adv} value={adv} disabled={costs[player.totalImprovements] > player.starPlayerPoints}>
              {adv} - {costs[player.totalImprovements]}
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
          <Button type="button" onClick={handleUpgrade}>Spin!</Button>
        </React.Fragment>}
      {type.startsWith('Chosen') && (
        <React.Fragment key={type}>
          <select value={selectedSkill ?? undefined} onChange={handleSkillSelection}>
            {(getAvailableCategories(type) ?? []).map(category => (
              <optgroup key={category} label={category}>
                {skills
                  .filter(isSkillSelectable(category))
                  .map(skill => (
                    <option key={skill.name} value={skill.name}>{skill.name}</option>
                  ))}
              </optgroup>
            ))}
          </select>
          <Button type="button" onClick={handleUpgrade}>Confirm</Button>
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
                    <select value={selectedSkill ?? undefined} onChange={handleSkillSelection}>
                      {rosterPlayer.secondary.map(category => (
                        <optgroup key={category} label={category}>
                          {skills
                            .filter(isSkillSelectable(category))
                            .map(skill => (
                              <option key={skill.name} value={skill.name}>{skill.name}</option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                  <span>
                    {idx !== 0 && <Button type="button" onClick={handleReorder('up', idx)}>Up</Button>}
                    {idx !== arr.length - 1 && <Button type="button" onClick={handleReorder('down', idx)}>Down</Button>}
                  </span>
                </li>
              ))}
          </ol>
          <Button type="button" onClick={handleUpgrade}>Spin!</Button>
        </React.Fragment>
      )}
    </>
  );
}
