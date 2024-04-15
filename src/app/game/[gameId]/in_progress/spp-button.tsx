import { Modal } from "components/modal";
import { useState } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { end } from "../actions";

type SPPType = keyof Required<
  Parameters<typeof end>[0]["playerUpdates"][string]
>["starPlayerPoints"];
type PlayerType = { id: string; name: string | null; number: number };
type FormValues = {
  team: "home" | "away";
  player: string;
  type: SPPType;
};

type Props = {
  onSubmit: (
    player: { name: string | null; id: string },
    type: SPPType,
  ) => void;
} & Record<"home" | "away", Record<"players" | "journeymen", PlayerType[]>>;

export default function SPPButton({ home, away, onSubmit }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { register, watch, setValue, handleSubmit } = useForm<FormValues>({
    defaultValues: { team: "home" },
  });

  const team = watch("team");
  const { players, journeymen } = team === "home" ? home : away;

  useEffect(() => {
    setValue("player", [...players, ...journeymen][0].id);
  }, [journeymen, players, setValue]);

  const onSubmitForm = handleSubmit(({ player, type }) => {
    const targetPlayer = [...journeymen, ...players].find(
      (p) => p.id === player,
    )!;
    onSubmit(targetPlayer, type);
    setIsOpen(false);
  });

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        <label>
          Team:
          <select className="select" {...register("team")}>
            <option>home</option>
            <option>away</option>
          </select>
        </label>
        <br />
        <label>
          Player:
          <select className="select" {...register("player")}>
            <optgroup label="Rostered">
              {players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.number}
                  {p.name && ` - ${p.name}`}
                </option>
              ))}
            </optgroup>
            <optgroup label="Journeymen">
              {journeymen.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.number}
                  {p.name && ` - ${p.name}`}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <br />
        <label>
          Type of SPP:
          <select className="select" {...register("type")}>
            <option value="casualties">Casualty</option>
            <option value="deflections">Deflection</option>
            <option value="interceptions">Interception</option>
            <option value="completions">Completion</option>
            <option value="otherSPP">Misc.</option>
          </select>
        </label>
        <button
          className="btn"
          onClick={() => {
            void onSubmitForm();
          }}
        >
          Done
        </button>
      </Modal>
      <button className="btn btn-sm" onClick={() => setIsOpen(true)}>
        Other SPP
      </button>
    </>
  );
}
