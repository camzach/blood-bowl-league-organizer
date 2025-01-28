import classNames from "classnames";
import { Modal } from "components/modal";
import { startOfSecond } from "date-fns";
import { PropsWithChildren, useState } from "react";
import { useForm } from "react-hook-form";

type Props = {
  onSubmit: (player: string) => void;
  className?: string;
  stars: string[];
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
  stars,
  onSubmit,
  className,
  children,
}: PropsWithChildren<Props>) {
  const { register, handleSubmit } = useForm<FormValues>();
  const [isOpen, setIsOpen] = useState(false);

  const onFormSubmit = handleSubmit(({ scoredBy }: FormValues): void => {
    onSubmit(scoredBy);
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
                  {p.number}
                  {p.name && ` - ${p.name}`}
                </option>
              ))}
            </optgroup>
            {journeymen.length > 0 && (
              <optgroup label="Journeymen">
                {journeymen.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number}
                    {p.name && ` - ${p.name}`}
                  </option>
                ))}
              </optgroup>
            )}
            {startOfSecond.length > 0 && (
              <optgroup label="Star Players">
                {stars.map((p) => (
                  <option key={p} value={p}>
                    {p}
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
        className={classNames("btn", className)}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </button>
    </>
  );
}
