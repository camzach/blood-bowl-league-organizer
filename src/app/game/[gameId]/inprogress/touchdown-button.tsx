import Button from "components/button";
import Dialog from "components/dialog";
import type { ReactElement } from "react";
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
  const ref = useRef<HTMLDialogElement>(null);

  const openModal = (): void => {
    ref.current?.showModal();
  };

  const onFormSubmit = handleSubmit(({ scoredBy }: FormValues): void => {
    const player = [...players, ...journeymen].find((p) => p.id === scoredBy);
    onSubmit(player);
    ref.current?.close();
  });

  return (
    <>
      <Dialog ref={ref}>
        <label>
          Scored By:
          <select {...register("scoredBy")}>
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
        <Button
          onClick={() => {
            void onFormSubmit();
          }}
        >
          Done
        </Button>
      </Dialog>
      <Button onClick={openModal} className={className}>
        TD {team}
      </Button>
    </>
  );
}
