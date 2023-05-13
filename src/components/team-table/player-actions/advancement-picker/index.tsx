"use client";
import type { ReactElement } from "react";
import { useRef } from "react";
import { Popup, advancementCosts } from "./popup";
import Button from "components/button";
import Dialog from "components/dialog";
import { SkillCategory } from "@prisma/client";

type StatType = "MA" | "ST" | "AG" | "PA" | "AV";
type Props = {
  player: {
    [key in `${StatType | "total"}Improvements`]: number;
  } & {
    [key in StatType]: key extends "PA" ? number | null : number;
  } & {
    id: string;
    primary: SkillCategory[];
    secondary: SkillCategory[];
    skills: Array<{ name: string }>;
    starPlayerPoints: number;
  };
  skills: Array<{ name: string; category: string }>;
};

export default function AdvancementPicker({
  player,
  skills,
}: Props): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canAdvance = Object.values(advancementCosts).some(
    (list) => list[player.totalImprovements] <= player.starPlayerPoints
  );

  return (
    <>
      <Dialog ref={dialogRef}>
        <Popup
          player={player}
          skills={skills}
          onHide={(): void => dialogRef.current?.close()}
        />
      </Dialog>
      <Button
        onClick={(): void => dialogRef.current?.showModal()}
        disabled={!canAdvance}
      >
        Spend SPP
      </Button>
    </>
  );
}
