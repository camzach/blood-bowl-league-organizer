"use client";
import { NumberInput } from "~/app/components/number-input";
import { useFetcher } from "react-router";

type Props = {
  title: string;
  type: any;
  current: number;
  cost: number;
  teamId: string;
  min?: number;
  max: number;
  treasury: number;
  disabled?: boolean;
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
  disabled = false,
}: Props) {
  const fetcher = useFetcher();
  
  // Rather than using the normal max, calculate a temporary max based on your treasury
  // This helps disable the tick up button when you can't afford any more
  const inputMax = Math.min(max, Math.floor(treasury / cost) + current);

  const hireStaff = (val: number): void => {
    if (val > current) {
      fetcher.submit(
        { action: "hire", type, quantity: (val - current).toString() },
        { method: "post", action: `/team/${teamId}/edit/staff` }
      );
    } else {
      fetcher.submit(
        { action: "fire", type, quantity: (current - val).toString() },
        { method: "post", action: `/team/${teamId}/edit/staff` }
      );
    }
  };

  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";
  
  if (isSubmitting) return <>Mutating...</>;

  return max > 1 ? (
    <NumberInput
      disabled={disabled}
      value={current}
      label={title}
      min={min}
      max={inputMax}
      onChange={hireStaff}
    />
  ) : (
    <input
      type="checkbox"
      className="checkbox"
      checked={current > 0}
      disabled={disabled || (current === 0 && treasury < cost)}
      onChange={(e): void => {
        hireStaff(Number(e.target.checked));
      }}
    ></input>
  );
}
