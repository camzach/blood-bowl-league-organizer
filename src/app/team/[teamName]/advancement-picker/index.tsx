'use client';
import type { ReactElement } from 'react';
import { useRef } from 'react';
import type { FetchedTeamType } from '../page';
import { Popup, advancementCosts } from './popup';
import Button from 'components/button';

type Props = {
  player: FetchedTeamType['players'][number];
  rosterPlayer: FetchedTeamType['roster']['positions'][number];
  skills: Array<{ name: string; category: string }>;
};

export default function AdvancementPicker({ player, rosterPlayer, skills }: Props): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canAdvance = Object.values(advancementCosts).some(list =>
    list[player.totalImprovements] <= player.starPlayerPoints);

  return <>
    <dialog ref={dialogRef}>
      <Popup
        player={player}
        rosterPlayer={rosterPlayer}
        skills={skills}
        onHide={(): void => dialogRef.current?.close()}
      />
    </dialog>
    <Button
      onClick={(): void => dialogRef.current?.showModal()}
      disabled={!canAdvance}
    >
      Spend SPP
    </Button>
  </>;
}
