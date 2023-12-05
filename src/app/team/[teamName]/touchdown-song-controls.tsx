"use client";
import classNames from "classnames";
import { useState, useTransition } from "react";
import { useController, useForm } from "react-hook-form";

type Props = { team: string; currentSong?: string; isEditable: boolean };

type FormValues = { songName: string; file: File };

export default function SongControls({ team, currentSong, isEditable }: Props) {
  const [showForm, setShowForm] = useState(false);

  const [isTransitioning, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>();
  const { field: fileControl } = useController({ control, name: "file" });
  const onSubmit = handleSubmit((data: FormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      formData.set(k, v);
    });
    startTransition(async () => {
      setShowForm(false);
      await fetch(`/api/songs/${team}`, {
        method: "POST",
        body: formData,
      });
    });
  });

  if (isTransitioning) return <div>Submitting song...</div>;

  const editor = (
    <>
      <span
        className={classNames([
          "mx-1 inline-block h-full w-0 border-4 border-transparent",
          !showForm && "border-l-current",
          showForm && "-translate-y-1/3 border-r-current",
        ])}
        onClick={() => {
          setShowForm((o) => !o);
        }}
      />
      <form
        className={showForm ? "join-vertical join" : "hidden"}
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <input
          {...register("songName", { required: true })}
          placeholder="Song name"
          className="input-bordered input join-item"
        />
        <input
          name={fileControl.name}
          ref={fileControl.ref}
          onChange={(e) => {
            if (!e.target.files) return;
            fileControl.onChange(e.target.files[0]);
          }}
          type="file"
          accept="audio/*"
          className="file-input-bordered file-input join-item"
        />
        <button className="join-item btn" type="submit">
          Submit
        </button>
      </form>
    </>
  );

  return (
    <div>
      {currentSong !== undefined
        ? `Touchdown song: ${currentSong}`
        : "No touchdown song selected"}
      {isEditable && editor}
    </div>
  );
}
