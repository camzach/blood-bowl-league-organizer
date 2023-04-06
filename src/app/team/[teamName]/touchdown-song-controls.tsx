'use client';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import useServerMutation from 'utils/use-server-mutation';

type Props = { team: string; currentSong?: string };

type FormValues = { songName: string; file: File };

export default function SongControls({ team, currentSong }: Props) {
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

  return <div>
    {currentSong !== undefined ? `Touchdown song: ${currentSong}` : 'No touchdown song selected'}
    <span
      style={{
        height: 0,
        width: 0,
        border: '5px solid transparent',
        borderTopColor: !showForm ? 'black' : 'transparent',
        borderBottomColor: showForm ? 'black' : 'transparent',
        transform: `translateY(${showForm ? '-' : ''}50%)`,
        display: 'inline-block',
      }}
      onClick={() => {
        setShowForm(o => !o);
      }}
    />
    <form
      onSubmit={e => {
        void onSubmit(e);
      }}
      style={{ display: showForm ? undefined : 'none' }}
    >
      <input {...register('songName', { required: true })} placeholder="Song name" />
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
      <button type="submit">Submit</button>
    </form>
  </div>;
}
