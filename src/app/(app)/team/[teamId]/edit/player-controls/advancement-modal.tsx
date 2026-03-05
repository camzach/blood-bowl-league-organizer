import { useState } from "react";
import classNames from "classnames";
import {
  learnSkill,
  rollRandomSkill,
  confirmRandomSkill,
  rollRandomStat,
  confirmRandomStat,
} from "./actions";
import type {
  skill,
  SkillCategory,
  pendingRandomSkill,
  pendingRandomStat,
  skillRelation,
} from "~/db/schema";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { getBlockedSkills } from "~/utils/get-blocked-skills";

export const advancementCosts = {
  "Random Primary": [3, 4, 6, 8, 10, 15],
  "Chosen Primary": [6, 8, 12, 16, 20, 30],
  "Chosen Secondary": [12, 14, 18, 22, 26, 40],
  "Characteristic Improvement": [18, 20, 24, 28, 32, 50],
} as const;

const characteristicsByRoll = [
  ["av"],
  ["av", "pa"],
  ["av", "ma", "pa"],
  ["ma", "pa"],
  ["ag", "ma"],
  ["ag", "st"],
  ["av", "pa", "ma", "ag", "st"],
] as const;

function upperFirst(str: string) {
  return (str.charAt(0)?.toUpperCase() ?? "") + str.slice(1);
}

type Props = {
  player: {
    id: string;
    skills: Array<{ name: string }>;
    totalImprovements: number;
    starPlayerPoints: number;
    position: {
      primary: Array<SkillCategory>;
      secondary: Array<SkillCategory>;
    };
    pendingRandomSkill: typeof pendingRandomSkill.$inferSelect | null;
    pendingRandomStat: typeof pendingRandomStat.$inferSelect | null;
  };
  skills: Array<typeof skill.$inferSelect>;
  skillRelations: Array<typeof skillRelation.$inferSelect>;
  onHide: () => void;
};
export function Popup({ player, skills, skillRelations, onHide }: Props) {
  const router = useRouter();
  const [fallbackSkill, setFallbackSkill] = useState<string | null>(null);
  const [tab, setTab] = useState<SkillCategory | "stat">(
    player.position.primary[0] ?? player.position.secondary[0],
  );

  const { execute: executeLearnSkill } = useAction(learnSkill, {
    onSuccess() {
      router.refresh();
      onHide();
    },
  });

  const { execute: executeRollRandomSkill } = useAction(rollRandomSkill, {
    onSuccess() {
      router.refresh();
    },
  });

  const { execute: executeConfirmRandomSkill } = useAction(confirmRandomSkill, {
    onSuccess() {
      router.refresh();
      onHide();
    },
  });

  const { execute: executeRollRandomStat } = useAction(rollRandomStat, {
    onSuccess() {
      router.refresh();
    },
  });

  const { execute: executeConfirmRandomStat } = useAction(confirmRandomStat, {
    onSuccess() {
      router.refresh();
      onHide();
    },
  });

  const purchaseSkill = (skill: string) => () => {
    if (tab === "stat") return;
    executeLearnSkill({
      player: player.id,
      skill,
    });
  };

  const purchaseRandom = () => {
    if (tab === "stat") return;
    executeRollRandomSkill({
      player: player.id,
      category: tab,
    });
  };

  const purchaseStat = () => {
    executeRollRandomStat({
      player: player.id,
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
      devious: [],
    },
  );

  const blockedSkills = getBlockedSkills(
    player.skills.map((s) => s.name),
    skillRelations,
  );

  const hasPending = !!(player.pendingRandomSkill || player.pendingRandomStat);

  const canTakeRandom =
    player.starPlayerPoints >=
    advancementCosts["Random Primary"][player.totalImprovements];
  const canTakePrimary =
    player.starPlayerPoints >=
    advancementCosts["Chosen Primary"][player.totalImprovements];
  const canTakeSecondary =
    player.starPlayerPoints >=
    advancementCosts["Chosen Secondary"][player.totalImprovements];
  const canTakeCharacteristic =
    player.starPlayerPoints >=
    advancementCosts["Characteristic Improvement"][player.totalImprovements];

  return (
    <>
      {player.pendingRandomSkill && (
        <div className="flex flex-col gap-2">
          <p>Choose one of the following random skills:</p>
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() =>
                executeConfirmRandomSkill({
                  player: player.id,
                  skill: player.pendingRandomSkill?.skillName1 ?? "",
                })
              }
            >
              {player.pendingRandomSkill.skillName1}
            </button>
            <button
              className="btn btn-primary"
              onClick={() =>
                executeConfirmRandomSkill({
                  player: player.id,
                  skill: player.pendingRandomSkill?.skillName2 ?? "",
                })
              }
            >
              {player.pendingRandomSkill.skillName2}
            </button>
          </div>
        </div>
      )}
      {player.pendingRandomStat && (
        <div className="flex flex-col gap-2">
          <p>
            You rolled a {player.pendingRandomStat.roll} for a stat increase.
            Choose one of the following:
          </p>
          <div className="flex flex-wrap gap-2">
            {characteristicsByRoll[
              Math.min(player.pendingRandomStat.roll - 1, 6)
            ]?.map((stat) => (
              <button
                key={stat}
                className="btn btn-primary"
                onClick={() =>
                  executeConfirmRandomStat({
                    player: player.id,
                    choice: stat,
                  })
                }
              >
                {stat.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="divider">OR</div>
          <p>Choose a new skill</p>
          <div className="flex gap-2">
            <select
              className="select select-bordered w-full max-w-xs"
              value={fallbackSkill ?? ""}
              onChange={(e) => setFallbackSkill(e.target.value)}
            >
              <option value="" disabled>
                Select a skill
              </option>
              {player.position.primary.map((category) => (
                <optgroup key={category} label={upperFirst(category)}>
                  {skills
                    .filter((s) => s.category === category)
                    .map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
              ))}
              {player.position.secondary.map((category) => (
                <optgroup key={category} label={upperFirst(category)}>
                  {skills
                    .filter((s) => s.category === category)
                    .map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button
              className="btn btn-primary"
              disabled={!fallbackSkill}
              onClick={() => {
                if (fallbackSkill) {
                  executeConfirmRandomStat({
                    player: player.id,
                    choice: "fallback_skill",
                    fallbackSkill: fallbackSkill,
                  });
                }
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
      {!player.pendingRandomStat && !player.pendingRandomSkill && (
        <>
          <div role="tablist" className="tabs tabs-box">
            {player.position.primary.map((category) => (
              <a
                role="tab"
                key={category}
                className={classNames(
                  "tab px-1",
                  tab === category && "tab-active",
                  !canTakeRandom && "tab-disabled",
                )}
                onClick={() => canTakeRandom && setTab(category)}
              >
                {upperFirst(category)}
              </a>
            ))}
            {player.position.primary.length > 0 && (
              <div className="divider divider-horizontal mx-0 px-0" />
            )}
            {player.position.secondary.map((category) => (
              <a
                role="tab"
                key={category}
                className={classNames(
                  "tab px-1",
                  tab === category && "tab-active",
                  !canTakeSecondary && "tab-disabled",
                )}
                onClick={() => canTakeSecondary && setTab(category)}
              >
                {upperFirst(category)}
              </a>
            ))}
            {player.position.secondary.length > 0 && (
              <div className="divider divider-horizontal mx-0 px-0" />
            )}
            <a
              role="tab"
              className={classNames(
                "tab px-1",
                tab === "stat" && "tab-active",
                !canTakeCharacteristic && "tab-disabled",
              )}
              onClick={() => canTakeCharacteristic && setTab("stat")}
            >
              Stat
            </a>
          </div>
          <div className="divider my-0 py-0" />
          {tab !== "stat" && (
            <div className="form-control gap-2">
              <div className="grid grid-cols-4 gap-2">
                {skillsByCategory[tab].map((s) => (
                  <button
                    key={s.name}
                    className={classNames([
                      "btn leading-4",
                      player.skills.some((ps) => ps.name === s.name) &&
                        "btn-outline",
                    ])}
                    disabled={
                      hasPending ||
                      blockedSkills.has(s.name) ||
                      (player.position.primary.includes(tab) &&
                        !canTakePrimary) ||
                      (player.position.secondary.includes(tab) &&
                        !canTakeSecondary)
                    }
                    onClick={purchaseSkill(s.name)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              {player.position.primary.includes(tab) && (
                <button
                  className="btn btn-secondary btn-wide mx-auto"
                  onClick={purchaseRandom}
                  disabled={hasPending || !canTakeRandom}
                >
                  {`Random - ${
                    advancementCosts["Random Primary"][player.totalImprovements]
                  } SPP`}
                </button>
              )}
            </div>
          )}
          {tab === "stat" && (
            <div className="form-control gap-2">
              <button
                className="btn btn-secondary"
                onClick={purchaseStat}
                disabled={hasPending || !canTakeCharacteristic}
              >
                Roll for Stat Increase
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
