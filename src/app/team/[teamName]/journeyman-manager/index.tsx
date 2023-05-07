"use client";
import React from "react";
import type { FetchedTeamType } from "../page";
import type { TeamTableProps } from "components/team-table";
import { TeamTable } from "components/team-table";
import AdvancementPicker from "../advancement-picker";
import HireButton from "./hire-button";

const baseCols = [
  "Position",
  "Skills",
  "MA",
  "ST",
  "PA",
  "AG",
  "AV",
  "NI",
  "MNG?",
  "SPP",
  "TV",
  "CTV",
] as const;

type Props = {
  players: FetchedTeamType["journeymen"];
  freeNumbers: number[];
  teamName: string;
  allowHiring: boolean;
  skills: Array<{ name: string; category: string }>;
};
export function JourneymanManager({
  players,
  freeNumbers,
  teamName,
  allowHiring,
  skills,
}: Props): React.ReactElement {
  const [numbers, setNumbers] = React.useState(
    Object.fromEntries(
      players.map((p) => [
        p.id,
        freeNumbers.includes(p.number) ? p.number : freeNumbers[0],
      ])
    )
  );

  const handleNumberChange = React.useCallback(
    (id: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      const number = parseInt(e.target.value, 10);
      if (Number.isNaN(number)) return;
      setNumbers((o) => ({
        ...o,
        [id]: number,
      }));
    },
    []
  );

  const cols: TeamTableProps<FetchedTeamType["journeymen"][number]>["cols"] = [
    ...baseCols,
  ];
  if (allowHiring) {
    cols.unshift({
      name: "Hire!",
      render: (player: FetchedTeamType["journeymen"][number]) => (
        <td key="Hire!">
          <HireButton
            player={player.id}
            team={teamName}
            number={numbers[player.id]}
          />
        </td>
      ),
    });
    cols.unshift({
      name: "#",
      render: (p) => (
        <td key="#">
          <select value={numbers[p.id]} onChange={handleNumberChange(p.id)}>
            {freeNumbers.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </td>
      ),
    });
    cols.splice(11, 0, {
      name: "Spend SPP",
      render: (player) => (
        <td key="Spend SPP">
          <AdvancementPicker
            player={player}
            rosterPlayer={player.position}
            skills={skills}
          />
        </td>
      ),
    });
  }

  return <TeamTable players={players} cols={cols} />;
}
