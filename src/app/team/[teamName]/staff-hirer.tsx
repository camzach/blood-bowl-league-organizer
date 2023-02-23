'use client';
import { NumberInput } from 'components/number-input';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  title: string;
  type: Parameters<typeof trpc.team.hireStaff.mutate>[0]['type'];
  current: number;
  cost: number;
  teamName: string;
  max: number;
  treasury: number;
};

export default function StaffHirer({ title, current, type, teamName, cost, max, treasury }: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();
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
    return () => {};
  }, [error, isMutating]);

  const hireStaff = (val: number): void => {
    startMutation();
    const action = val > current
      ? trpc.team.hireStaff.mutate({ team: teamName, type, quantity: val - current })
      : trpc.team.fireStaff.mutate({ team: teamName, type, quantity: current - val });
    void action
      .catch(() => { setError(true); })
      .finally(endMutation);
  };

  if (isMutating)
    return <>Mutating...</>;

  if (error)
    return <>Failed to hire staff</>;

  return max > 1
    ? <NumberInput
      value={current}
      label={title}
      min={0}
      max={inputMax}
      onChange={hireStaff}
    />
    : <input
      type="checkbox"
      checked={current > 0}
      disabled={current === 0 && treasury < cost}
      onChange={(e): void => {
        hireStaff(Number(e.target.checked));
      }}
    ></input>;
}
