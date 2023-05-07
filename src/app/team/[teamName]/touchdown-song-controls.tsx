'use client';
import classNames from 'classnames';
import Button from 'components/button';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import useServerMutation from 'utils/use-server-mutation';

type Props = { team: string; currentSong?: string; isEditable: boolean };

type FormValues = { songName: string; file: File };

export default function SongControls({ team, currentSong, isEditable }: Props) {
  const [showForm, setShowForm] = useState(false);

  const { startMutation, endMutation, isMutating } = useServerMutation();
  const { register, handleSubmit, control } = useForm<FormValues>();
  const { field: fileControl } = useController({ control, name: 'file' });
  const onSubmit = handleSubmit((data: FormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      formData.set(k, v);
    });
    startMutation();
    setShowForm(false);
    void fetch(`/api/songs/${team}`, {
      method: 'POST',
      body: formData,
    }).then(() => {
      endMutation();
    });
  });

  if (isMutating) return <div>Submitting song...</div>;

  const editor = (
    <>
      <span
        className={classNames([
          'mx-1 inline-block h-full w-0 border-4 border-transparent',
          !showForm && 'border-t-black',
          showForm && 'border-b-black -translate-y-1/3',
        ])}
        onClick={() => {
          setShowForm(o => !o);
        }}
      />
      <form
        className={showForm ? undefined : 'hidden'}
        onSubmit={e => {
          void onSubmit(e);
        }}
      >
        <input
          {...register('songName', { required: true })}
          placeholder="Song name"
        />
        <input
          name={fileControl.name}
          ref={fileControl.ref}
          onChange={e => {
            if (!e.target.files) return;
            fileControl.onChange(e.target.files[0]);
          }}
          type="file"
          accept="audio/*"
        />
        <Button type="submit">Submit</Button>
      </form>
    </>
  );

  return (
    <div>
      {currentSong !== undefined
        ? `Touchdown song: ${currentSong}`
        : 'No touchdown song selected'}
      {isEditable && editor}
    </div>
  );
}
