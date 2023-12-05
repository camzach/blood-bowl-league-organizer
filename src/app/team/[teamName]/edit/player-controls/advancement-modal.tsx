import { useState } from "react";
import classNames from "classnames";
import { StatList } from "./stat-list";
import { learnSkill } from "./actions";
import type { skill, SkillCategory } from "db/schema";
import useRefreshingAction from "utils/use-refreshing-action";

export const advancementCosts = {
  "Random Primary": [3, 4, 6, 8, 10, 15],
  "Chosen Primary": [6, 8, 12, 16, 20, 30],
  "Random Secondary": [6, 8, 12, 16, 20, 30],
  "Chosen Secondary": [12, 14, 18, 22, 26, 40],
  "Characteristic Improvement": [18, 20, 24, 28, 32, 50],
} as const;

const skillConflicts: Partial<Record<string, string[]>> = {
  "No Hands": ["Catch", "Diving Catch", "Safe Pair of Hands"],
  Frenzy: ["Grab"],
  Grab: ["Frenzy"],
  Leap: ["Pogo Stick"],
  "Pogo Stick": ["Leap"],
  "Ball & Chain": [
    "Grab",
    "Leap",
    "Multiple Block",
    "On the Ball",
    "Shadowing",
  ],
};

type Props = {
  player: {
    id: string;
    skills: Array<{ name: string }>;
    totalImprovements: number;
    position: {
      primary: Array<SkillCategory>;
      secondary: Array<SkillCategory>;
    };
  };
  skills: Array<typeof skill.$inferSelect>;
  onHide: () => void;
};
export function Popup({ player, skills, onHide }: Props) {
  const [tab, setTab] = useState<SkillCategory | "stat">(
    player.position.primary[0],
  );
  const { status, execute } = useRefreshingAction(learnSkill);

  const purchaseSkill = (skill: string) => () => {
    if (tab === "stat") return;
    execute({
      player: player.id,
      type: "chosen",
      skill,
    });
  };
  const purchaseRandom = () => {
    if (tab === "stat") return;
    execute({
      player: player.id,
      type: "random",
      category: tab,
    });
  };

  const skillsByCategory = skills.reduce<
    Record<SkillCategory, Array<typeof skill.$inferSelect>>
  >(
    (prev, current) => ({
      ...prev,
      [current.category]: [...prev[current.category], current],
    }),
    {
      general: [],
      agility: [],
      mutation: [],
      passing: [],
      strength: [],
      trait: [],
    },
  );

  const disabledSkills = player.skills.flatMap(
    (s) => skillConflicts[s.name] ?? [],
  );

  const statIncreaseSkills = {
    primary: Object.fromEntries(
      player.position.primary.map((category) => [
        category,
        skillsByCategory[category].filter(
          (s) =>
            !disabledSkills.includes(s.name) &&
            !player.skills.some((skill) => skill.name === s.name),
        ),
      ]),
    ),
    secondary: Object.fromEntries(
      player.position.secondary.map((category) => [
        category,
        skillsByCategory[category].filter(
          (s) =>
            !disabledSkills.includes(s.name) &&
            !player.skills.some((skill) => skill.name === s.name),
        ),
      ]),
    ),
  };

  if (status === "executing") return <>Mutating...</>;

  return (
    <>
      <div className="tabs">
        {player.position.primary.map((category) => (
          <div
            key={category}
            className={classNames([
              "tab tab-lifted",
              tab === category && "tab-active",
            ])}
            onClick={() => setTab(category)}
          >
            {`${category} - ${
              advancementCosts["Chosen Primary"][player.totalImprovements]
            } SPP`}
          </div>
        ))}
        {player.position.secondary.map((category) => (
          <div
            key={category}
            className={classNames([
              "tab tab-lifted",
              tab === category && "tab-active",
            ])}
            onClick={() => setTab(category)}
          >
            {`${category} - ${
              advancementCosts["Chosen Secondary"][player.totalImprovements]
            } SPP`}
          </div>
        ))}
        <div
          className={classNames(["tab", tab === "stat" && "tab-active"])}
          onClick={() => setTab("stat")}
        >
          {`Stat Increase - ${
            advancementCosts["Characteristic Improvement"][
              player.totalImprovements
            ]
          }`}
        </div>
      </div>
      {tab !== "stat" && (
        <div className="form-control gap-2">
          <div className="grid grid-cols-4 gap-2">
            {skillsByCategory[tab].map((s) => (
              <button
                key={s.name}
                className={classNames([
                  "btn",
                  player.skills.some((sk) => sk.name === s.name) &&
                    "btn-outline",
                ])}
                disabled={
                  disabledSkills.includes(s.name) ||
                  player.skills.some((sk) => sk.name === s.name)
                }
                onClick={purchaseSkill(s.name)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={purchaseRandom}>
            {`Random - ${
              advancementCosts[
                `Random ${
                  player.position.primary.includes(tab)
                    ? "Primary"
                    : "Secondary"
                }`
              ][player.totalImprovements]
            } SPP`}
          </button>
        </div>
      )}
      {tab === "stat" && (
        <StatList playerId={player.id} skills={statIncreaseSkills} />
      )}
    </>
  );
}
