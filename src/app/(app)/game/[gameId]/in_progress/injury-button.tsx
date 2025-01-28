import { Modal } from "components/modal";
import { PropsWithChildren, useState } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { end } from "../actions";
import classNames from "classnames";

type InjuryType =
  | NonNullable<Parameters<typeof end>[0]["playerUpdates"][number]["injury"]>
  | "regen";
type PlayerType = { id: string; name: string | null; number: number };

type Props = {
  onSubmit: (options: {
    by?: string;
    player: string;
    injury: InjuryType | "bh";
  }) => void;
  targets: Record<
    "players" | "journeymen",
    (PlayerType & { nigglingInjuries: number })[]
  > & { stars: string[] };
  actors?: Record<"players" | "journeymen", PlayerType[]> & { stars: string[] };
  className?: string;
};

type FormValues = {
  injuredPlayer: string;
  causingPlayer?: string;
  type: InjuryType;
};

export default function InjuryButton({
  targets,
  actors,
  className,
  children,
  onSubmit,
}: PropsWithChildren<Props>) {
  const { register, setValue, handleSubmit } = useForm<FormValues>();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const players = [...(actors?.players ?? []), ...(actors?.journeymen ?? [])];
    setValue("causingPlayer", players[0]?.id);
  }, [setValue, actors?.players, actors?.journeymen]);

  useEffect(() => {
    setValue(
      "injuredPlayer",
      [...targets.players, ...targets.journeymen][0].id,
    );
  }, [setValue, targets.players, targets.journeymen]);

  const onFormSubmit = handleSubmit((data) => {
    onSubmit({
      player: [
        ...targets.journeymen,
        ...targets.players,
        ...targets.stars.map((s) => ({ id: s })),
      ].find((p) => p.id === data.injuredPlayer)!.id,
      injury: data.type,
      by:
        actors &&
        [
          ...actors.journeymen,
          ...actors.players,
          ...actors.stars.map((s) => ({ id: s })),
        ].find((p) => p.id === data.causingPlayer)?.id,
    });
    setIsOpen(false);
  });

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        <div className="form-control">
          <label>
            Injured Player:
            <select
              className="select select-bordered select-sm"
              {...register("injuredPlayer")}
            >
              <optgroup label="Rostered Players">
                {targets.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number}
                    {p.name && ` - ${p.name}`}
                    {p.nigglingInjuries > 0 && ` (${p.nigglingInjuries} NI)`}
                  </option>
                ))}
              </optgroup>
              {targets.journeymen.length > 0 && (
                <optgroup label="Journeymen">
                  {targets.journeymen.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number}
                      {p.name && ` - ${p.name}`}
                      {p.nigglingInjuries > 0 && ` (${p.nigglingInjuries} NI)`}
                    </option>
                  ))}
                </optgroup>
              )}
              {targets.stars.length > 0 && (
                <optgroup label="Star Players">
                  {targets.stars.map((p) => (
                    <option key={p} value={p}>
                      {p}
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
              className="select select-bordered select-sm"
              {...register("type")}
            >
              <option value="regen">None (regenerated)</option>
              <option value="bh">Badly Hurt</option>
              <option value="mng">Miss Next Game</option>
              <option value="ni">Niggling Injury</option>
              <option value="st">-1 ST</option>
              <option value="av">-1 AV</option>
              <option value="ma">-1 MA</option>
              <option value="ag">+1 AG</option>
              <option value="pa">+1 PA</option>
              <option value="dead">Dead</option>
            </select>
          </label>
          <br />
          {actors && (
            <label>
              Caused By:
              <select
                className="select select-bordered select-sm"
                {...register("causingPlayer")}
              >
                <optgroup label="Rostered Players">
                  {actors.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number}
                      {p.name && ` - ${p.name}`}
                    </option>
                  ))}
                </optgroup>
                {actors.journeymen.length > 0 && (
                  <optgroup label="Journeymen">
                    {actors.journeymen.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.number}
                        {p.name && ` - ${p.name}`}
                      </option>
                    ))}
                  </optgroup>
                )}
                {actors.stars.length > 0 && (
                  <optgroup label="Star Players">
                    {actors.stars.map((p) => (
                      <option key={p} value={p}>
                        {p}
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
      <button
        className={classNames("btn", className)}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </button>
    </>
  );
}
