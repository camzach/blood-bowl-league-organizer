import { ComponentProps } from "react";
import { cols } from "./cols";
import Table from "components/table";

export type PlayerType = {
  id: string;
  name: string | null;
  number: number;
  MA: number;
  PA: number | null;
  AG: number;
  ST: number;
  AV: number;
  teamValue: number;
  missNextGame: boolean;
  starPlayerPoints: number;
  nigglingInjuries: number;
  skills: Array<{
    name: string;
    rules: string;
    faq?: Array<{ q: string; a: string }>;
  }>;
  position: { name: string };
};

export type TeamTableProps<T extends PlayerType> = {
  players: T[];
  cols?: Array<
    (
      | (typeof cols)[number]["id"]
      | ComponentProps<typeof Table<T>>["columns"]
    )[number]
  >;
  compact?: boolean;
};

export function TeamTable<T extends PlayerType>({
  players,
  cols: displayCols = [...cols],
  compact,
}: TeamTableProps<T>) {
  return (
    <Table
      className={compact ? "table-compact" : undefined}
      rows={players.sort((a, b) => a.number - b.number)}
      columns={displayCols
        .map((col) =>
          typeof col === "string" ? cols.find((c) => c.id === col) : col
        )
        .filter(
          (x): x is ComponentProps<typeof Table<T>>["columns"][number] => !!x
        )}
    />
  );
}
