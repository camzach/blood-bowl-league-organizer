import { Modal } from "~/components/modal";
import { PropsWithChildren, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import classNames from "classnames";
import { casualtyEvent, injuryType } from "../actions/game-events";
import z from "zod";

type InjuryType = z.infer<typeof injuryType>;

type PlayerType = {
  id: string;
  name: string | null;
  number: number;
  keywords: { name: string; canBeHated: boolean }[];
};

type StarPlayerType = {
  name: string;
  keywords: { name: string; canBeHated: boolean }[];
};

type Props = {
  onSubmit: (ev: z.infer<typeof casualtyEvent>) => void;
  targets: Record<
    "players" | "journeymen",
    (Omit<PlayerType, "keywords"> & { nigglingInjuries: number })[]
  > & { stars: StarPlayerType[] };
  actors?: Record<"players" | "journeymen", PlayerType[]> & {
    stars: StarPlayerType[];
  };
  className?: string;
};

type FormValues = {
  injuredPlayer: string;
  causingPlayer?: string;
  type: InjuryType;
  keyword?: string;
};

export default function InjuryButton({
  targets,
  actors,
  className,
  children,
  onSubmit,
}: PropsWithChildren<Props>) {
  const { register, handleSubmit, setValue, control } = useForm<FormValues>({
    defaultValues: {
      type: "bh",
      causingPlayer:
        actors?.players[0]?.id ??
        actors?.journeymen[0]?.id ??
        actors?.stars[0]?.name,
      injuredPlayer:
        targets.players[0]?.id ??
        targets.journeymen[0]?.id ??
        targets.stars[0]?.name,
      keyword: (
        actors?.players[0] ??
        actors?.journeymen[0] ??
        actors?.stars[0]
      )?.keywords.filter((k) => k.canBeHated)[0]?.name,
    },
  });
  const [isOpen, setIsOpen] = useState(false);

  const causingPlayerId = useWatch({ control, name: "causingPlayer" });

  const allActors = actors ? [...actors.players, ...actors.journeymen] : [];
  const allStars = actors ? actors.stars : [];

  const causingPlayer =
    allActors.find((p) => p.id === causingPlayerId) ??
    allStars.find((p) => p.name === causingPlayerId);

  const causingPlayerKeywords =
    causingPlayer?.keywords.filter((k) => k.canBeHated) ?? [];

  const onFormSubmit = handleSubmit((data) => {
    const keyword = data.keyword;
    if (data.causingPlayer && keyword) {
      onSubmit({
        type: "casualty",
        player: data.injuredPlayer,
        injury: {
          type: data.type,
          causedBy: {
            player: data.causingPlayer,
            type: allStars.some((s) => s.name === data.causingPlayer)
              ? "star"
              : "player",
            hatredKeyword: keyword,
          },
        },
      });
    } else if (!data.causingPlayer) {
      onSubmit({
        type: "casualty",
        player: data.injuredPlayer,
        injury: { type: data.type },
      });
    } else {
      return;
    }
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
                    <option key={p.name} value={p.name}>
                      {p.name}
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
            <>
              <label>
                Caused By:
                <select
                  className="select select-bordered select-sm"
                  {...register("causingPlayer", {
                    onChange(e) {
                      const player =
                        allActors.find((p) => p.id === e.target.value) ??
                        allStars.find((p) => p.name === e.target.value)!;

                      setValue(
                        "keyword",
                        player.keywords.filter((k) => k.canBeHated)[0].name,
                      );
                    },
                  })}
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
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              {causingPlayerKeywords.length > 0 && (
                <label>
                  Keyword:
                  <select
                    className="select select-bordered select-sm"
                    disabled={causingPlayerKeywords.length < 2}
                    {...register("keyword")}
                  >
                    {causingPlayerKeywords
                      .filter((kw) => kw.canBeHated)
                      .map((kw) => (
                        <option key={kw.name} value={kw.name}>
                          {kw.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </>
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
