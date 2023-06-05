"use client";
import { NumberInput } from "components/number-input";
import { useEffect, useState } from "react";
import {
  hireStaff as hireStaffAction,
  fireStaff as fireStaffAction,
} from "./actions";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  title: string;
  type: Parameters<typeof hireStaffAction>[0]["type"];
  current: number;
  cost: number;
  teamName: string;
  max: number;
  treasury: number;
};

export default function StaffHirer({
  title,
  current,
  type,
  teamName,
  cost,
  max,
  treasury,
}: Props) {
  const { startMutation, isMutating } = useServerMutation();
  const [error, setError] = useState(false);

  // Rather than using the normal max, calculate a temporary max based on your treasury
  // This helps disable the tick up button when you can't afford any more
  const inputMax = Math.min(max, Math.floor(treasury / cost) + current);

  useEffect(() => {
    if (error && !isMutating) {
      const timeout = setTimeout(() => {
        setError(false);
      }, 1500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [error, isMutating]);

  const hireStaff = (val: number): void => {
    startMutation(() => {
      const action =
        val > current
          ? hireStaffAction({
              team: teamName,
              type,
              quantity: val - current,
            })
          : fireStaffAction({
              team: teamName,
              type,
              quantity: current - val,
            });
      return action.catch(() => {
        setError(true);
      });
    });
  };

  if (isMutating) return <>Mutating...</>;

  if (error) return <>Failed to hire staff</>;

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
