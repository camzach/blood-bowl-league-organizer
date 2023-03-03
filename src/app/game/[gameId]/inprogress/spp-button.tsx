import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { trpc } from 'utils/trpc';

type SPPType = keyof Parameters<typeof trpc['game']['end']['mutate']>[0]['starPlayerPoints'][string];
type PlayerType = { id: string; name: string | null; number: number };

type Props = {
  onSubmit: (
    player: string,
    type: SPPType
  ) => void;
} & Record<'home' | 'away', Record<'players' | 'journeymen', PlayerType[]>>;

export default function SPPButton({ home, away, onSubmit }: Props): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const [team, setTeam] = useState<'home' | 'away'>('home');
  const [player, setPlayer] = useState<string | null>(null);
  const [type, setType] = useState<SPPType | null>(null);

  const openModal = (): void => {
    ref.current?.showModal();
  };

  const handleSubmit = (): void => {
    if (player === null || type === null) return;
    onSubmit(player, type);
    ref.current?.close();
  };

  const { players, journeymen } = team === 'home' ? home : away;

  return <>
    <dialog ref={ref}>
      <label>
        Team:
        <select value={team} onChange={(e): void => { setTeam(e.target.value as 'home' | 'away'); }}>
          <option>home</option>
          <option>away</option>
        </select>
      </label>
      <br/>
      <label>
        Player:
        <select value={player ?? undefined} onChange={(e): void => { setPlayer(e.target.value); }}>
          <optgroup label="Rostered">
            {players.map(p => <option value={p.id} key={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>
          <optgroup label="Journeymen">
            {journeymen.map(p => <option value={p.id} key={p.id}>{p.name ?? p.number}</option>)}
          </optgroup>
        </select>
      </label>
      <br/>
      <label>
        Type of SPP:
        <select value={type ?? undefined} onChange={(e): void => { setType(e.target.value as SPPType); }}>
          <option value="casualties">Casualty</option>
          <option value="deflections">Deflection</option>
          <option value="interceptions">Interception</option>
          <option value="completions">Completion</option>
          <option value="otherSPP">Misc.</option>
        </select>
      </label>
      <button onClick={handleSubmit}>Done</button>
    </dialog>
    <button onClick={openModal}>Other SPP</button>
  </>;
}
