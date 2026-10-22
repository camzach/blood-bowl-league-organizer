"use client";
import { NumberInput } from "~/app/components/number-input";
import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  title: string;
  type: string;
  current: number;
  cost: number;
  teamId: string;
  min?: number;
  max: number;
  treasury: number;
  canHire: boolean;
  canFire: boolean;
};

export default function StaffHirer({
  title,
  current,
  type,
  teamId,
  cost,
  min = 0,
  max,
  treasury,
  canHire,
  canFire,
}: Props) {
  const fetcher = useFetcher();

  useFetcherErrorNotification(fetcher);

  // Rather than using the normal max, calculate a temporary max based on your treasury
  // This helps disable the tick up button when you can't afford any more
  const inputMax = canHire
    ? Math.min(max, Math.floor(treasury / cost) + current)
    : current;
  const inputMin = canFire ? min : current;

  const hireStaff = (val: number): void => {
    if (val > current) {
      fetcher.submit(
        { action: "hire", type, quantity: (val - current).toString() },
        { method: "post", action: `/team/${teamId}/edit/staff` },
      );
    } else {
      fetcher.submit(
        { action: "fire", type, quantity: (current - val).toString() },
        { method: "post", action: `/team/${teamId}/edit/staff` },
      );
    }
  };

  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading";

  if (isSubmitting) return <>Mutating...</>;

  return (
    <>
      {max > 1 ? (
        <NumberInput
          disabled={!canHire && !canFire}
          value={current}
          label={title}
          min={inputMin}
          max={inputMax}
          onChange={hireStaff}
        />
      ) : (
        <input
          type="checkbox"
          className="checkbox"
          checked={current > 0}
          disabled={current > 0 ? !canFire : !canHire || treasury < cost}
          onChange={(e): void => {
            hireStaff(Number(e.target.checked));
          }}
        ></input>
      )}
    </>
  );
}
