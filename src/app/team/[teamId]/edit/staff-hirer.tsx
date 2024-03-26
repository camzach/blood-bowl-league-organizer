"use client";
import { NumberInput } from "components/number-input";
import {
  hireStaff as hireStaffAction,
  fireStaff as fireStaffAction,
} from "./actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  title: string;
  type: Parameters<typeof hireStaffAction>[0]["type"];
  current: number;
  cost: number;
  teamId: string;
  max: number;
  treasury: number;
};

export default function StaffHirer({
  title,
  current,
  type,
  teamId,
  cost,
  max,
  treasury,
}: Props) {
  const { execute: hireAction, status: hireStatus } = useRefreshingAction(
    hireStaffAction,
    {
      onError: (_, __, reset) => {
        setTimeout(reset, 1500);
      },
    },
  );
  const { execute: fireAction, status: fireStatus } = useRefreshingAction(
    fireStaffAction,
    {
      onError: (_, __, reset) => {
        setTimeout(reset, 1500);
      },
    },
  );

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
      value={current}
      label={title}
      min={0}
      max={inputMax}
      onChange={hireStaff}
    />
  ) : (
    <input
      type="checkbox"
      className="checkbox"
      checked={current > 0}
      disabled={current === 0 && treasury < cost}
      onChange={(e): void => {
        hireStaff(Number(e.target.checked));
      }}
    ></input>
  );
}
