import type { Player, Skill, SkillCategory } from "@prisma/client";
import React, { useState } from "react";
import { trpc } from "utils/trpc";
import classNames from "classnames";
import { StatList } from "./stat-list";
import useServerMutation from "utils/use-server-mutation";

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
  player: Player & { skills: Skill[] };
  skills: Skill[];
  onHide: () => void;
};
export function Popup({ player, skills, onHide }: Props) {
  const [tab, setTab] = useState<SkillCategory | "stat">(player.primary[0]);
  const { startMutation, endMutation, isMutating } = useServerMutation();

  const purchaseSkill = (skill: string) => () => {
    if (tab === "stat") return;
    startMutation();
    trpc.player.improve
      .mutate({
        player: player.id,
        update: {
          type: "chosen",
          subtype: player.primary.includes(tab) ? "primary" : "secondary",
          skill,
        },
      })
      .then(endMutation);
  };
  const purchaseRandom = () => {
    if (tab === "stat") return;
    startMutation();
    trpc.player.improve
      .mutate({
        player: player.id,
        update: {
          type: "random",
          subtype: player.primary.includes(tab) ? "primary" : "secondary",
          category: tab,
        },
      })
      .then(endMutation);
  };

  const skillsByCategory = skills.reduce<Record<SkillCategory, Skill[]>>(
    (prev, current) => ({
      ...prev,
      [current.category]: [...prev[current.category], current],
    }),
    { S: [], A: [], M: [], G: [], P: [], T: [] }
  );

  const disabledSkills = player.skills.flatMap(
    (s) => skillConflicts[s.name] ?? []
  );

  const statIncreaseSkills = {
    primary: Object.fromEntries(
      player.primary.map((category) => [
        category,
        skillsByCategory[category].filter(
          (s) =>
            !disabledSkills.includes(s.name) &&
            !player.skills.some((skill) => skill.name === s.name)
        ),
      ])
    ),
    secondary: Object.fromEntries(
      player.secondary.map((category) => [
        category,
        skillsByCategory[category].filter(
          (s) =>
            !disabledSkills.includes(s.name) &&
            !player.skills.some((skill) => skill.name === s.name)
        ),
      ])
    ),
  };

  if (isMutating) return <>Mutating...</>;

  return (
    <>
      <div className="tabs">
        {player.primary.map((category) => (
          <div
            key={category}
            className={classNames([
              "tab-lifted tab",
              tab === category && "tab-active",
            ])}
            onClick={() => setTab(category)}
          >
            {`${category} - ${
              advancementCosts["Chosen Primary"][player.totalImprovements]
            } SPP`}
          </div>
        ))}
        {player.secondary.map((category) => (
          <div
            key={category}
            className={classNames([
              "tab-lifted tab",
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
          <button className="btn-secondary btn" onClick={purchaseRandom}>
            {`Random - ${
              advancementCosts[
                `Random ${
                  player.primary.includes(tab) ? "Primary" : "Secondary"
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
