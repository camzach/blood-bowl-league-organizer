import { SkillCategory, skill } from "~/db/schema";
import { increaseCharacteristic } from "./actions";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";

type Stat = "ma" | "av" | "pa" | "ag" | "st";
const stats: Stat[] = ["ma", "av", "pa", "ag", "st"];

const results: Array<[number, Array<(typeof stats)[number]>]> = [
  [7 / 16, ["ma", "av"]],
  [6 / 16, ["ma", "av", "pa"]],
  [1 / 16, ["ag", "pa"]],
  [1 / 16, ["st", "ag"]],
  [1 / 16, ["ma", "av", "pa", "ag", "st"]],
];

function isNonempty<T>(array: T[]): array is [T, ...T[]] {
  return array.length > 0;
}

type Props = {
  playerId: string;
  skills: {
    primary: {
      [key in SkillCategory]?: Array<typeof skill.$inferSelect>;
    };
    secondary: {
      [key in SkillCategory]?: Array<typeof skill.$inferSelect>;
    };
  };
};

export function StatList({ playerId, skills }: Props) {
  const router = useRouter();
  const [chosenStats, setChosenStats] = useState<Stat[]>([]);
  const [skill, setSkill] = useState("");
  const { execute, status } = useAction(increaseCharacteristic, {
    onSuccess() {
      router.refresh();
    },
  });

  const remainingItems = stats.filter((i) => !chosenStats.includes(i));

  const probs = results
    .map<[number, (typeof stats)[number] | "skill"]>(([prob, res]) => [
      prob,
      chosenStats.find((i) => res.includes(i)) ?? "skill",
    ])
    .reduce<Record<(typeof stats)[number] | "skill", number>>(
      (prev, [prob, item]) => ({ ...prev, [item]: prev[item] + prob }),
      {
        ma: 0,
        st: 0,
        ag: 0,
        av: 0,
        pa: 0,
        skill: 0,
      },
    );

  const commit = () => {
    if (!isNonempty(chosenStats)) return;
    execute({
      player: playerId,
      preferences: chosenStats,
      skill,
    });
  };

  if (status === "executing") return <>Updating...</>;

  return (
    <>
      <div className="form-control">
        <span className="text-lg">Stat preferences:</span>
        <table className="table-zebra my-2 table w-fit">
          <thead>
            <tr>
              <th></th>
              <th>Stat</th>
              <th>Probability</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {chosenStats.map((stat, i) => (
              <tr key={stat}>
                <td>{i + 1}</td>
                <td>{stat.toUpperCase()}</td>
                <td>{probs[stat] * 100}%</td>
                <td>
                  <div className="join">
                    <button
                      className="btn btn-primary join-item btn-xs"
                      disabled={i === 0}
                      onClick={() =>
                        setChosenStats((o) => {
                          const newArr = [...o];
                          newArr.splice(i, 1);
                          newArr.splice(i - 1, 0, stat);
                          return newArr;
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      className="btn btn-primary join-item btn-xs"
                      disabled={i === chosenStats.length - 1}
                      onClick={() =>
                        setChosenStats((o) => {
                          const newArr = [...o];
                          newArr.splice(i, 1);
                          newArr.splice(i + 1, 0, stat);
                          return newArr;
                        })
                      }
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-secondary join-item btn-xs"
                      onClick={() =>
                        setChosenStats((o) => o.filter((el) => el !== stat))
                      }
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td>{chosenStats.length + 1}</td>
              <td>
                <select
                  className="select select-bordered select-sm"
                  onChange={(e) => setSkill(e.target.value)}
                  value={skill}
                >
                  {Object.entries(skills.primary).map(([category, sks]) => (
                    <optgroup key={category} label={`Primary - ${category}`}>
                      {sks.map((skill) => (
                        <option key={skill.name} value={skill.name}>
                          {skill.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {Object.entries(skills.secondary).map(([category, sks]) => (
                    <optgroup key={category} label={`Secondary - ${category}`}>
                      {sks.map((skill) => (
                        <option key={skill.name} value={skill.name}>
                          {skill.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </td>
              <td>{probs["skill"] * 100}%</td>
              <td />
            </tr>
          </tbody>
        </table>
        {remainingItems.length > 0 && (
          <select
            className="select select-bordered select-sm"
            onChange={(e) => {
              setChosenStats((o) => [
                ...o,
                e.target.value as (typeof stats)[number],
              ]);
            }}
            value=""
          >
            <option disabled value="">
              Add another preference
            </option>
            {remainingItems.map((opt) => (
              <option key={opt} value={opt}>
                {opt.toUpperCase()}
              </option>
            ))}
          </select>
        )}
        <button
          className="btn mt-2"
          disabled={chosenStats.length === 0}
          onClick={commit}
        >
          Commit
        </button>
      </div>
    </>
  );
}
