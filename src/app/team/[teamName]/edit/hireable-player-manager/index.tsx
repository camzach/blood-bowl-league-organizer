"use client";
import type { TeamTableProps } from "components/team-table";
import { TeamTable } from "components/team-table";
import { useState, useCallback } from "react";
import fetchTeam from "../../fetch-team";
import { PlayerActions } from "../player-controls/action-buttons";
import { skill } from "db/schema";

type FetchedTeamType = Exclude<Awaited<ReturnType<typeof fetchTeam>>, null>;

type Props = {
  players: FetchedTeamType["players"];
  freeNumbers: number[];
  skills: Array<typeof skill.$inferSelect>;
  state: "draft" | "hiring" | "improving";
};
export function HireablePlayerManager({
  skills,
  state,
  players,
  freeNumbers,
}: Props) {
  const [numbers, setNumbers] = useState(
    Object.fromEntries(
      players.map((p) => [
        p.id,
        freeNumbers.includes(p.number) ? p.number : freeNumbers[0],
      ])
    )
  );

  const handleNumberChange = useCallback(
    (id: string) => (n: number) => {
      setNumbers((o) => ({
        ...o,
        [id]: n,
      }));
    },
    []
  );

  const cols: TeamTableProps<(typeof players)[number]>["cols"] = [
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
    "name",
    "position",
    "skills",
    "ma",
    "st",
    "pa",
    "ag",
    "av",
    "ni",
    "mng",
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
    {
      name: "Actions",
      id: "act",
      Component: (player) => (
        <PlayerActions player={player} skills={skills} state={state} />
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
    className="select select-bordered select-sm"
    value={currentNumber}
    onChange={(e) => onNumberChange(+e.target.value)}
  >
    {freeNumbers.map((n) => (
      <option key={n}>{n}</option>
    ))}
  </select>
);
