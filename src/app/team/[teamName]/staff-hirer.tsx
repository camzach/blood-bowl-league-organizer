'use client';
import { NumberInput } from 'components/number-input';
import type { ReactElement } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  title: string;
  type: Parameters<typeof trpc.team.hireStaff.mutate>[0]['type'];
  current: number;
  cost: number;
  teamName: string;
  max: number;
};

export default function StaffHirer({ title, current, type, teamName, max }: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();

  const hireStaff = (val: number): void => {
    startMutation();
    const action = val > current
      ? trpc.team.hireStaff.mutate({ team: teamName, type, quantity: val - current })
      : trpc.team.fireStaff.mutate({ team: teamName, type, quantity: current - val });
    void action
      .then(endMutation);
  };

  if (isMutating)
    return <>Mutating...</>;

  return max > 1
    ? <NumberInput
      value={current}
      label={title}
      min={0}
      max={max}
      onChange={hireStaff}
    />
    : <input
      type="checkbox"
      checked={current > 0}
      onChange={(e): void => {
        hireStaff(Number(e.target.checked));
      }}
    ></input>;
}
