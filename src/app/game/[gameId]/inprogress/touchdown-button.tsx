'use client';
import type { ReactElement } from 'react';
import { useRef } from 'react';

type Props = {
  onSubmit: (player?: string) => void;
} & Record<'players' | 'journeymen', Array<{ id: string; name: string | null; number: number }>>;

export default function TDButton({ players, journeymen, onSubmit }: Props): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const ref2 = useRef<HTMLSelectElement>(null);

  const openModal = (): void => {
    ref.current?.showModal();
  };

  const handleSubmit = (): void => {
    onSubmit(ref2.current?.value);
    ref.current?.close();
  };

  return <>
    <dialog ref={ref}>
      <label>
            Scored By:
        <select ref={ref2}>
          <optgroup label="Rostered Players">
            {players.map(p => <option key={p.id} value={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>
          {journeymen.length > 0 && <optgroup label="Journeymen">
            {journeymen.map(p => <option key={p.id} value={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>}
        </select>
      </label>
      <button onClick={handleSubmit}>Done</button>
    </dialog>
    <button onClick={openModal}>TD Home</button>
  </>;
}
