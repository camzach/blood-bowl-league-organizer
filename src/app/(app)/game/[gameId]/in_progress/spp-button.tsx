import { Modal } from "components/modal";
import { PropsWithChildren, useState } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import classNames from "classnames";

type SPPType = "completions" | "interceptions" | "deflections" | "otherSPP";
type PlayerType = { id: string; name: string | null; number: number };
type FormValues = {
  team: "home" | "away";
  player: string;
  type: SPPType;
};

type Props = {
  onSubmit: (
    player: { name: string | null; id: string; number: number },
    type: SPPType,
  ) => void;
  players: PlayerType[];
  journeymen: PlayerType[];
  className?: string;
};

export default function SPPButton({
  players,
  journeymen,
  className,
  children,
  onSubmit,
}: PropsWithChildren<Props>) {
  const [isOpen, setIsOpen] = useState(false);
  const { register, setValue, handleSubmit } = useForm<FormValues>();

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
      <button
        className={classNames("btn", className)}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </button>
    </>
  );
}
