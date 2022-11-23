'use client';
import { NumberInput } from 'components/number-input';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { trpc } from 'utils/trpc';

type Props = {
  title: string;
  type: 'apothecary' | 'assistantCoaches' | 'cheerleaders' | 'rerolls';
  current: number;
  cost: number;
  teamName: string;
  max: number;
};

export default function StaffHirer({ title, current, type, teamName, max }: Props): ReactElement {
  const router = useRouter();

  const hireStaff = (val: number): void => {
    if (val > current) {
      void trpc.team.hireStaff.mutate({ team: teamName, type, quantity: val - current })
        .then(() => {
          router.refresh();
        });
    } else {
      void trpc.team.fireStaff.mutate({ team: teamName, type, quantity: current - val })
        .then(() => {
          router.refresh();
        });
    }
  };

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
