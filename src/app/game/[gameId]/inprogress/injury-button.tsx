'use client';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { trpc } from 'utils/trpc';

type InjuryType = Parameters<typeof trpc['game']['end']['mutate']>[0]['injuries'][number]['injury'];
type PlayerType = { id: string; name: string | null; number: number };

type Props = {
  onSubmit: (
    team: 'home' | 'away' | 'neither',
    options: { by?: string; player: string; injury: InjuryType | 'BH' }
  ) => void;
} & Record<'home' | 'away', Record<'players' | 'journeymen', PlayerType[]>>;

export default function InjuryButton({ home, away, onSubmit }: Props): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const ref2 = useRef<HTMLSelectElement>(null);
  const ref3 = useRef<HTMLSelectElement>(null);
  const ref4 = useRef<HTMLSelectElement>(null);
  const [injuredTeam, setInjuredTeam] = useState<'home' | 'away'>('home');
  const [causingTeam, setCausingTeam] = useState<'home' | 'away' | 'neither'>('home');

  const openModal = (): void => {
    ref.current?.showModal();
  };

  const handleSubmit = (): void => {
    if (!ref2.current) return;
    if (!ref3.current) return;
    onSubmit(causingTeam, {
      player: ref2.current.value,
      injury: ref3.current.value as InjuryType,
      by: ref4.current?.value,
    });
    ref.current?.close();
  };

  return <>
    <dialog ref={ref}>
      <label>
        Injured Player&apos;s team:
        <select value={injuredTeam} onChange={(e): void => { setInjuredTeam(e.target.value as 'home' | 'away'); }}>
          <option>home</option>
          <option>away</option>
        </select>
      </label>
      <label>
        Injured Player:
        <select ref={ref2}>
          <optgroup label="Rostered Players">
            {(injuredTeam === 'home' ? home : away)
              .players.map(p => <option key={p.id} value={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>
          {(injuredTeam === 'home' ? home : away).journeymen.length > 0 && <optgroup label="Journeymen">
            {(injuredTeam === 'home' ? home : away)
              .journeymen.map(p => <option key={p.id} value={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>}
        </select>
      </label>
      <br/>
      <label>
        Type of injury:
        <select ref={ref3}>
          <option value="BH">Badly Hurt</option>
          <option value="MNG">Miss Next Game</option>
          <option value="NI">Niggling Injury</option>
          <option value="ST">-1 ST</option>
          <option value="AV">-1 AV</option>
          <option value="MA">-1 MA</option>
          <option value="AG">+1 AG</option>
          <option value="PA">+1 PA</option>
          <option value="DEAD">Dead</option>
        </select>
      </label>
      <br/>
      <label>
        Caused by Team:
        <select
          value={causingTeam}
          onChange={(e): void => { setCausingTeam(e.target.value as 'home' | 'away' | 'neither'); }}
        >
          <option>home</option>
          <option>away</option>
          <option>neither</option>
        </select>
      </label>
      {causingTeam !== 'neither' && <label>
        Caused By:
        <select ref={ref4}>
          <optgroup label="Rostered Players">
            {(causingTeam === 'home' ? home : away)
              .players.map(p => <option key={p.id} value={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>
          {(causingTeam === 'home' ? home : away).journeymen.length > 0 && <optgroup label="Journeymen">
            {(causingTeam === 'home' ? home : away)
              .journeymen.map(p => <option key={p.id} value={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>}
        </select>
      </label>}
      <button onClick={handleSubmit}>Done</button>
    </dialog>
    <button onClick={openModal}>Booboo</button>
  </>;
}
