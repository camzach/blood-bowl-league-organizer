"use client";
import React from "react";
import type { FetchedTeamType } from "../page";
import type { TeamTableProps } from "components/team-table";
import { TeamTable } from "components/team-table";
// import AdvancementPicker from "../player-actions/advancement-picker";
import HireButton from "./hire-button";

type Props = {
  players: FetchedTeamType["journeymen" | "redrafts"];
  freeNumbers: number[];
  teamName: string;
  skills: Array<{ name: string; category: string }>;
};
export function HireablePlayerManager({
  players,
  freeNumbers,
  teamName,
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
    (id: string) => (n: number) => {
      setNumbers((o) => ({
        ...o,
        [id]: n,
      }));
    },
    []
  );

  const cols: TeamTableProps<FetchedTeamType["journeymen"][number]>["cols"] = [
    {
      name: "#",
      id: "#",
      Component: (player) => (
        <NumberPicker
          freeNumbers={freeNumbers}
          currentNumber={numbers[player.id]}
          onNumberChange={handleNumberChange(player.id)}
        />
      ),
    },
    {
      name: "Hire!",
      id: "hire",
      Component: (player: FetchedTeamType["journeymen"][number]) => (
        <HireButton
          player={player.id}
          team={teamName}
          number={numbers[player.id]}
        />
      ),
    },
    "position",
    "skills",
    "ma",
    "st",
    "pa",
    "ag",
    "av",
    "ni",
    "mng",
    // {
    //   name: "Spend SPP",
    //   id: "spendSPP",
    //   Component: (player) => (
    //     <AdvancementPicker player={player} skills={skills} />
    //   ),
    // },
    "spp",
    "tv",
    {
      name: "Seasons Played",
      id: "seasons",
      Component: (p) => <>{p.seasonsPlayed}</>,
    },
    {
      name: "Hiring fee",
      id: "hiringFee",
      Component: (p) => (
        <>{`${(p.teamValue + 20_000 * p.seasonsPlayed) / 1000}k`}</>
      ),
    },
  ];

  return <TeamTable players={players} cols={cols} />;
}

type NumberPickerProps = {
  currentNumber: number;
  freeNumbers: number[];
  onNumberChange: (number: number) => void;
};
const NumberPicker = ({
  currentNumber,
  freeNumbers,
  onNumberChange,
}: NumberPickerProps) => (
  <select
    className="select-bordered select select-sm"
    value={currentNumber}
    onChange={(e) => onNumberChange(+e.target.value)}
  >
    {freeNumbers.map((n) => (
      <option key={n}>{n}</option>
    ))}
  </select>
);
