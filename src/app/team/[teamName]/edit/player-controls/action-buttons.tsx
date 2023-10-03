"use client";
import PlayerFirer from "./player-firer";
import { Popup, advancementCosts } from "./advancement-modal";
import { useState } from "react";
import { Modal } from "components/modal";
import { skill } from "db/schema";
import type fetchTeam from "../../fetch-team";

type Props = {
  player: NonNullable<Awaited<ReturnType<typeof fetchTeam>>>["players"][number];
  skills: Array<typeof skill.$inferSelect>;
};

export function PlayerActions({ player, skills }: Props) {
  const [isOpen, setOpen] = useState(false);
  const canAdvance = Object.values(advancementCosts).some(
    (list) => list[player.totalImprovements] <= player.starPlayerPoints
  );

  return (
    <>
      <div className="btn-group btn-group-vertical">
        <button
          className="btn-accent btn-sm btn"
          onClick={() => setOpen(true)}
          disabled={!canAdvance}
        >
          Spend SPP
        </button>
        <PlayerFirer {...player} />
      </div>
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
