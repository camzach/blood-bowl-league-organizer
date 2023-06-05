import { Modal } from "components/modal";
import { useState } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { end } from "../actions";

type InjuryType = Parameters<typeof end>[0]["injuries"][number]["injury"];
type PlayerType = { id: string; name: string | null; number: number };

type NameAndId = { name: string | null; id: string };
type Props = {
  onSubmit: (
    team: "home" | "away" | "neither",
    options: { by?: NameAndId; player: NameAndId; injury: InjuryType | "BH" }
  ) => void;
} & Record<"home" | "away", Record<"players" | "journeymen", PlayerType[]>>;

type FormValues = {
  injuredTeam: "home" | "away";
  injuredPlayer: string;
  causingTeam: "home" | "away" | "neither";
  causingPlayer?: string;
  type: InjuryType;
};

export default function InjuryButton({ home, away, onSubmit }: Props) {
  const { register, watch, setValue, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      injuredTeam: "home",
      causingTeam: "neither",
    },
  });
  const [isOpen, setIsOpen] = useState(false);

  const [injuredTeam, causingTeam] = watch(["injuredTeam", "causingTeam"]);
  const causingPlayers = (() => {
    switch (causingTeam) {
      case "home":
        return { players: home.players, journeymen: home.journeymen };
      case "away":
        return { players: away.players, journeymen: away.journeymen };
      default:
        return null;
    }
  })();
  const injuredPlayers =
    injuredTeam === "home"
      ? { players: home.players, journeymen: home.journeymen }
      : { players: away.players, journeymen: away.journeymen };

  useEffect(() => {
    if (causingTeam === "neither") {
      setValue("causingPlayer", undefined);
    } else {
      const players = [
        ...(causingPlayers?.players ?? []),
        ...(causingPlayers?.journeymen ?? []),
      ];
      setValue("causingPlayer", players[0]?.id);
    }
  }, [
    setValue,
    causingTeam,
    causingPlayers?.players,
    causingPlayers?.journeymen,
  ]);

  useEffect(() => {
    setValue(
      "injuredPlayer",
      [...injuredPlayers.players, ...injuredPlayers.journeymen][0].id
    );
  }, [
    setValue,
    injuredTeam,
    injuredPlayers.players,
    injuredPlayers.journeymen,
  ]);

  const onFormSubmit = handleSubmit((data) => {
    onSubmit(data.causingTeam, {
      player: [...injuredPlayers.journeymen, ...injuredPlayers.players].find(
        (p) => p.id === data.injuredPlayer
      )!,
      injury: data.type,
      by: [
        ...(causingPlayers?.journeymen ?? []),
        ...(causingPlayers?.players ?? []),
      ].find((p) => p.id === data.causingPlayer),
    });
    setIsOpen(false);
  });

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        <div className="form-control">
          <label>
            Injured Player&apos;s team:
            <select
              className="select-bordered select select-sm"
              {...register("injuredTeam")}
            >
              <option>home</option>
              <option>away</option>
            </select>
          </label>
          <label>
            Injured Player:
            <select
              className="select-bordered select select-sm"
              {...register("injuredPlayer")}
            >
              <optgroup label="Rostered Players">
                {injuredPlayers.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.number}
                  </option>
                ))}
              </optgroup>
              {injuredPlayers.journeymen.length > 0 && (
                <optgroup label="Journeymen">
                  {injuredPlayers.journeymen.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? p.number}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <br />
          <label>
            Type of injury:
            <select
              className="select-bordered select select-sm"
              {...register("type")}
            >
              <option value="BH">Badly Hurt</option>
              <option value="MNG">Miss Next Game</option>
              <option value="NI">Niggling Injury</option>
              <option value="ST">-1 ST</option>
              <option value="AV">-1 AV</option>
              <option value="MA">-1 MA</option>
              <option value="AG">+1 AG</option>
              <option value="PA">+1 PA</option>
              <option value="DEAD">Dead</option>
            </select>
          </label>
          <br />
          <label>
            Caused by Team:
            <select
              className="select-bordered select select-sm"
              {...register("causingTeam")}
            >
              <option>home</option>
              <option>away</option>
              <option>neither</option>
            </select>
          </label>
          {causingPlayers && (
            <label>
              Caused By:
              <select
                className="select-bordered select select-sm"
                {...register("causingPlayer")}
              >
                <optgroup label="Rostered Players">
                  {causingPlayers.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? p.number}
                    </option>
                  ))}
                </optgroup>
                {causingPlayers.journeymen.length > 0 && (
                  <optgroup label="Journeymen">
                    {causingPlayers.journeymen.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name ?? p.number}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          )}
          <button
            className="btn"
            onClick={() => {
              void onFormSubmit();
            }}
          >
            Done
          </button>
        </div>
      </Modal>
      <button className="btn-sm btn" onClick={() => setIsOpen(true)}>
        Booboo
      </button>
    </>
  );
}
