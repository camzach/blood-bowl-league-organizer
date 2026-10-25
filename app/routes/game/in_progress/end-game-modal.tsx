import { useState } from "react";
import { Modal } from "~/app/components/modal";

type BasePlayer = {
  id: string;
  name: string | null;
  number: number;
  missNextGame: boolean;
};

type EndGameModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  homeTeamName: string;
  awayTeamName: string;
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
  homeTeamName,
  awayTeamName,
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
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="MVP Nomination"
    >
      <div className="grid grid-cols-2 gap-4">
        <fieldset>
          <legend className="text-lg font-semibold">{homeTeamName}</legend>
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
        </fieldset>
        <fieldset>
          <legend className="text-lg font-semibold">{awayTeamName}</legend>
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
        </fieldset>
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
