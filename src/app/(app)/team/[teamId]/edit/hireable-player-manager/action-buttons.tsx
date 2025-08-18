"use client";
import { Popup, advancementCosts } from "../player-controls/advancement-modal";
import { useState } from "react";
import { Modal } from "~/components/modal";
import { skill } from "~/db/schema";
import type fetchTeam from "../../fetch-team";
import PlayerHirer from "./hire-button";

type Props = {
  player: NonNullable<Awaited<ReturnType<typeof fetchTeam>>>["players"][number];
  number: number;
  skills: Array<typeof skill.$inferSelect>;
  state: "hiring" | "improving" | "draft";
};

export function PlayerActions({ player, skills, state, number }: Props) {
  const [isOpen, setOpen] = useState(false);
  const canAdvance =
    Object.values(advancementCosts).some(
      (list) => list[player.totalImprovements] <= player.starPlayerPoints,
    ) && player.totalImprovements < 6;

  return (
    <>
      {(state === "hiring" || state === "draft") && (
        <PlayerHirer player={player.id} number={number} />
      )}
      {state === "improving" && (
        <button
          className="btn btn-accent btn-sm"
          onClick={() => setOpen(true)}
          disabled={!canAdvance}
        >
          Spend SPP
        </button>
      )}
      {canAdvance && (
        <Modal isOpen={isOpen} onRequestClose={() => setOpen(false)}>
          <div className="whitespace-pre-wrap">
            <Popup
              player={player}
              skills={skills}
              onHide={() => setOpen(false)}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
