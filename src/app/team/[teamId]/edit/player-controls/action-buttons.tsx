"use client";
import FireButton from "./player-firer";
import { Popup, advancementCosts } from "./advancement-modal";
import { useState } from "react";
import { Modal } from "components/modal";
import { skill } from "db/schema";
import type fetchTeam from "../../fetch-team";

type Props = {
  player: NonNullable<Awaited<ReturnType<typeof fetchTeam>>>["players"][number];
  skills: Array<typeof skill.$inferSelect>;
  state: "hiring" | "improving" | "draft";
};

export function PlayerActions({ player, skills, state }: Props) {
  const [isOpen, setOpen] = useState(false);
  const canAdvance =
    Object.values(advancementCosts).some(
      (list) => list[player.totalImprovements] <= player.starPlayerPoints,
    ) && player.totalImprovements < 6;

  return (
    <>
      {state === "improving" ? (
        <button
          className="btn btn-accent btn-sm"
          onClick={() => setOpen(true)}
          disabled={!canAdvance}
        >
          Spend SPP
        </button>
      ) : (
        <FireButton id={player.id} />
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
