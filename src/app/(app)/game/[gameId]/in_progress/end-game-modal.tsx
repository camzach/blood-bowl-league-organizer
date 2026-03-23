import { useState } from "react";
import { Modal } from "~/components/modal";

type BasePlayer = {
  id: string;
  name: string | null;
  number: number;
  missNextGame: boolean;
};

type EndGameModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  homePlayers: BasePlayer[];
  awayPlayers: BasePlayer[];
  onSubmit: (
    homeNominees: string[],
    awayNominees: string[],
    homeStalled: boolean,
    awayStalled: boolean,
  ) => void;
};

export function EndGameModal({
  isOpen,
  onRequestClose,
  homePlayers,
  awayPlayers,
  onSubmit,
}: EndGameModalProps) {
  const [homeNominees, setHomeNominees] = useState<string[]>([]);
  const [awayNominees, setAwayNominees] = useState<string[]>([]);
  const [homeStalled, setHomeStalled] = useState(false);
  const [awayStalled, setAwayStalled] = useState(false);

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
    onSubmit(homeNominees, awayNominees, homeStalled, awayStalled);
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-2xl font-bold">MVP Nomination</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Home Team</h3>
          <div className="mb-2">
            <label>
              <input
                type="checkbox"
                checked={homeStalled}
                onChange={(e) => setHomeStalled(e.target.checked)}
              />
              Stalled this game
            </label>
          </div>
          {homePlayers.map((player) => (
            <div key={player.id}>
              <label>
                <input
                  type="checkbox"
                  checked={homeNominees.includes(player.id)}
                  onChange={() => handleHomeSelect(player.id)}
                  disabled={
                    homeNominees.length >= 6 &&
                    !homeNominees.includes(player.id)
                  }
                />
                {player.name ?? `#${player.number}`}
              </label>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-lg font-semibold">Away Team</h3>
          <div className="mb-2">
            <label>
              <input
                type="checkbox"
                checked={awayStalled}
                onChange={(e) => setAwayStalled(e.target.checked)}
              />
              Stalled this game
            </label>
          </div>
          {awayPlayers.map((player) => (
            <div key={player.id}>
              <label>
                <input
                  type="checkbox"
                  checked={awayNominees.includes(player.id)}
                  onChange={() => handleAwaySelect(player.id)}
                  disabled={
                    awayNominees.length >= 6 &&
                    !awayNominees.includes(player.id)
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
