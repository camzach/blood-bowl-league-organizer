"use client";
import { NumberInput } from "~/components/number-input";
import {
  hireStaff as hireStaffAction,
  fireStaff as fireStaffAction,
} from "./actions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";

type Props = {
  title: string;
  type: Parameters<typeof hireStaffAction>[0]["type"];
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
  const router = useRouter();
  const {
    execute: hireAction,
    status: hireStatus,
    reset: resetHire,
  } = useAction(hireStaffAction, {
    onError() {
      setTimeout(resetHire, 1500);
    },
    onSuccess() {
      router.refresh();
    },
  });
  const {
    execute: fireAction,
    status: fireStatus,
    reset: resetFire,
  } = useAction(fireStaffAction, {
    onError() {
      setTimeout(resetFire, 1500);
    },
    onSuccess() {
      router.refresh();
    },
  });

  // Rather than using the normal max, calculate a temporary max based on your treasury
  // This helps disable the tick up button when you can't afford any more
  const inputMax = Math.min(max, Math.floor(treasury / cost) + current);

  const hireStaff = (val: number): void => {
    if (val > current) {
      hireAction({
        teamId,
        type,
        quantity: val - current,
      });
    } else {
      fireAction({
        teamId,
        type,
        quantity: current - val,
      });
    }
  };

  if (hireStatus === "executing" || fireStatus === "executing")
    return <>Mutating...</>;

  if (hireStatus === "hasErrored" || fireStatus === "hasErrored")
    return <>Failed to hire staff</>;

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
