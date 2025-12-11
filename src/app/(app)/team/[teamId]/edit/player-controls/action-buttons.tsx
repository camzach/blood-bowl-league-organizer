"use client";
import FireButton from "./player-firer";
import { Popup, advancementCosts } from "./advancement-modal";
import { useState } from "react";
import { Modal } from "~/components/modal";
import { skill, skillRelation } from "~/db/schema";
import type fetchTeam from "../../fetch-team";
import classNames from "classnames";
import CaptainButton from "./captain-button";

type Props = {
  player: NonNullable<Awaited<ReturnType<typeof fetchTeam>>>["players"][number];
  skills: Array<typeof skill.$inferSelect>;
  skillRelations: Array<typeof skillRelation.$inferSelect>;
  state: "hiring" | "improving" | "draft";
  hasCaptainRule: boolean;
  currentCaptainId: string | undefined;
};

export function PlayerActions({
  player,
  skills,
  skillRelations,
  state,
  hasCaptainRule,
  currentCaptainId,
}: Props) {
  const [isOpen, setOpen] = useState(false);
  const canAdvance =
    Object.values(advancementCosts).some(
      (list) => list[player.totalImprovements] <= player.starPlayerPoints,
    ) && player.totalImprovements < 6;

  return (
    <>
      {state === "improving" ? (
        <button
          className={classNames(
            "btn btn-sm",
            player.pendingRandomStat || player.pendingRandomSkill
              ? "btn-warning"
              : "btn-accent",
          )}
          onClick={() => setOpen(true)}
          disabled={!canAdvance}
        >
          Spend SPP
        </button>
      ) : (
        <FireButton id={player.id} />
      )}
      {hasCaptainRule &&
        (currentCaptainId === undefined || state === "draft") && (
          <CaptainButton
            playerId={player.id}
            disabled={currentCaptainId === player.id}
          />
        )}
      {canAdvance && (
        <Modal isOpen={isOpen} onRequestClose={() => setOpen(false)}>
          <div className="whitespace-pre-wrap">
            <Popup
              player={player}
              skills={skills}
              skillRelations={skillRelations}
              onHide={() => setOpen(false)}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
