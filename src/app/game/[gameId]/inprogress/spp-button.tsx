import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { trpc } from 'utils/trpc';

type SPPType = keyof Parameters<typeof trpc['game']['end']['mutate']>[0]['starPlayerPoints'][string];
type PlayerType = { id: string; name: string | null; number: number };
type FormValues = {
  team: 'home' | 'away';
  player: string;
  type: SPPType;
};

type Props = {
  onSubmit: (
    player: { name: string | null; id: string },
    type: SPPType
  ) => void;
} & Record<'home' | 'away', Record<'players' | 'journeymen', PlayerType[]>>;

export default function SPPButton({ home, away, onSubmit }: Props): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const { register, watch, setValue, handleSubmit } = useForm<FormValues>({ defaultValues: { team: 'home' } });

  const team = watch('team');
  const { players, journeymen } = team === 'home' ? home : away;

  useEffect(() => {
    setValue('player', [...players, ...journeymen][0].id);
  }, [journeymen, players, setValue]);

  const openModal = (): void => {
    ref.current?.showModal();
  };

  const onSubmitForm = handleSubmit(({ player, type }) => {
    // Player should always exist
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const targetPlayer = [...journeymen, ...players].find(p => p.id === player)!;
    onSubmit(targetPlayer, type);
    ref.current?.close();
  });

  return <>
    <dialog ref={ref}>
      <label>
        Team:
        <select {...register('team')}>
          <option>home</option>
          <option>away</option>
        </select>
      </label>
      <br/>
      <label>
        Player:
        <select {...register('player')}>
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
        <select {...register('type')}>
          <option value="casualties">Casualty</option>
          <option value="deflections">Deflection</option>
          <option value="interceptions">Interception</option>
          <option value="completions">Completion</option>
          <option value="otherSPP">Misc.</option>
        </select>
      </label>
      <button onClick={() => { void onSubmitForm(); }}>Done</button>
    </dialog>
    <button onClick={openModal}>Other SPP</button>
  </>;
}
