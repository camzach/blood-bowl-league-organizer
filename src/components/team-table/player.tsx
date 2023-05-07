import type { ReactElement } from "react";
import React from "react";
import type { PlayerType } from ".";
import type { cols as presetCols } from "./cols";
import Skill from "./skill";

type Props<T extends PlayerType> = {
  player: T;
  cols: Array<
    | (typeof presetCols)[number]
    | { name: string; render: (player: T) => React.ReactElement }
  >;
};

export function Player<T extends PlayerType>({
  player,
  cols,
}: Props<T>): React.ReactElement {
  const renderCols: Record<(typeof presetCols)[number], React.ReactElement> =
    React.useMemo(() => {
      const statCols = Object.fromEntries(
        (["MA", "ST", "PA", "AG", "AV"] as const).map((stat) => [
          stat,
          <td key={stat}>
            {player[stat] ?? "-"}
            {player[stat] !== null && ["PA", "AG", "AV"].includes(stat) && "+"}
          </td>,
        ])
      ) as Record<"AG" | "AV" | "MA" | "PA" | "ST", ReactElement>;

      return {
        "#": <td key="#">{player.number}</td>,
        CTV: <td key="CTV">{`${player.teamValue / 1000}k`}</td>,
        "MNG?": <td key="mng">{player.missNextGame && "🤕"}</td>,
        NI: <td key="NI">{player.nigglingInjuries}</td>,
        Name: <td key="Name">{player.name}</td>,
        Position: <td key="Position">{player.position.name}</td>,
        SPP: <td key="SPP">{player.starPlayerPoints}</td>,
        Skills: (
          <td key="Skills">
            {player.skills.map((skill, idx) => (
              <React.Fragment key={skill.name}>
                <Skill skill={skill} />
                {idx < player.skills.length - 1 ? ", " : ""}
              </React.Fragment>
            ))}
          </td>
        ),
        TV: <td key="TV">{`${player.teamValue / 1000}k`}</td>,
        ...statCols,
      };
    }, [player]);

  return (
    <tr>
      {cols.map((col) =>
        typeof col === "string" ? renderCols[col] : col.render(player)
      )}
    </tr>
  );
}
