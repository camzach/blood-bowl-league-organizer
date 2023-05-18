import classNames from "classnames";
import { Modal } from "components/modal";
import { ReactElement, useState } from "react";
import { useRef } from "react";
import { useForm } from "react-hook-form";

type NameAndId = { name: string | null; id: string };

type Props = {
  team: string;
  onSubmit: (player?: NameAndId) => void;
  className?: string;
} & Record<
  "players" | "journeymen",
  Array<{ id: string; name: string | null; number: number }>
>;

type FormValues = {
  scoredBy: string;
};

export default function TDButton({
  players,
  journeymen,
  team,
  onSubmit,
  className,
}: Props): ReactElement {
  const { register, handleSubmit } = useForm<FormValues>();
  const [isOpen, setIsOpen] = useState(false);

  const onFormSubmit = handleSubmit(({ scoredBy }: FormValues): void => {
    const player = [...players, ...journeymen].find((p) => p.id === scoredBy);
    onSubmit(player);
    setIsOpen(false);
  });

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        <label>
          Scored By:
          <select
            className="select-outlined select select-sm"
            {...register("scoredBy")}
          >
            <optgroup label="Rostered Players">
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.number}
                </option>
              ))}
            </optgroup>
            {journeymen.length > 0 && (
              <optgroup label="Journeymen">
                {journeymen.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.number}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <button
          className="btn"
          onClick={() => {
            void onFormSubmit();
          }}
        >
          Done
        </button>
      </Modal>
      <button
        className={classNames(["btn-sm btn", className])}
        onClick={() => setIsOpen(true)}
      >
        TD {team}
      </button>
    </>
  );
}
