"use client";

import { useState } from "react";
import { Modal } from "~/components/modal";

type BasePlayer = { id: string; name: string | null; number: number; missNextGame: boolean };

type MvpModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  homePlayers: BasePlayer[];
  awayPlayers: BasePlayer[];
  onMvpSubmit: (homeNominees: string[], awayNominees: string[]) => void;
};

export function MvpModal({
  isOpen,
  onRequestClose,
  homePlayers,
  awayPlayers,
  onMvpSubmit,
}: MvpModalProps) {
  const [homeNominees, setHomeNominees] = useState<string[]>([]);
  const [awayNominees, setAwayNominees] = useState<string[]>([]);

  const handleHomeSelect = (playerId: string) => {
    setHomeNominees((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId],
    );
  };

  const handleAwaySelect = (playerId: string) => {
    setAwayNominees((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId],
    );
  };

  const handleSubmit = () => {
    onMvpSubmit(homeNominees, awayNominees);
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-2xl font-bold">MVP Nomination</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Home Team</h3>
          {homePlayers.map((player) => (
            <div key={player.id}>
              <label>
                <input
                  type="checkbox"
                  checked={homeNominees.includes(player.id)}
                  onChange={() => handleHomeSelect(player.id)}
                  disabled={
                    homeNominees.length >= 6 && !homeNominees.includes(player.id)
                  }
                />
                {player.name ?? `#${player.number}`}
              </label>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-lg font-semibold">Away Team</h3>
          {awayPlayers.map((player) => (
            <div key={player.id}>
              <label>
                <input
                  type="checkbox"
                  checked={awayNominees.includes(player.id)}
                  onChange={() => handleAwaySelect(player.id)}
                  disabled={
                    awayNominees.length >= 6 && !awayNominees.includes(player.id)
                  }
                  />
                {player.name ?? `#${player.number}`}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={homeNominees.length !== 6 || awayNominees.length !== 6}
        >
          Submit Nominations
        </button>
      </div>
    </Modal>
  );
}
