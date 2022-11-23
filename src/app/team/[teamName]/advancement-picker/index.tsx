'use client';
import type { ReactElement } from 'react';
import { useRef } from 'react';
import type { FetchedTeamType } from '../page';
import { Popup, advancementCosts } from './popup';

type Props = {
  player: FetchedTeamType['players'][number];
  rosterPlayer: FetchedTeamType['roster']['positions'][number];
};

export default function AdvancementPicker({ player, rosterPlayer }: Props): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canAdvance = Object.values(advancementCosts).some(list =>
    list[player.totalImprovements] <= player.starPlayerPoints);

  return <>
    <dialog ref={dialogRef}>
      <Popup
        player={player}
        rosterPlayer={rosterPlayer}
        onHide={(): void => dialogRef.current?.close()}
      />
    </dialog>
    <button
      onClick={(): void => dialogRef.current?.showModal()}
      disabled={!canAdvance}
    >
      Spend SPP
    </button>
  </>;
}
