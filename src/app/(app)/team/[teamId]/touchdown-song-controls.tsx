"use client";
import classNames from "classnames";
import { useState, useTransition } from "react";
import { useController, useForm } from "react-hook-form";
import { uploadTouchdownSong } from "../../../api/songs/actions"; // Import the server action

type Props = { teamId: string; currentSong?: string; isEditable: boolean };

type FormValues = { songName: string; file: File };

export default function SongControls({
  teamId,
  currentSong,
  isEditable,
}: Props) {
  const [showForm, setShowForm] = useState(false);

  const [isTransitioning, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>();
  const { field: fileControl } = useController({ control, name: "file" });
  const onSubmit = handleSubmit((data: FormValues) => {
    const formData = new FormData();
    formData.append("teamId", teamId); // Add teamId to FormData
    formData.append("songName", data.songName);
    formData.append("file", data.file);

    startTransition(async () => {
      setShowForm(false);
      try {
        // Directly call the action with FormData
        await uploadTouchdownSong({
          teamId,
          songName: data.songName,
          file: data.file,
        });
        // Handle success, e.g., revalidate path if needed
      } catch (error) {
        console.error("Error uploading song:", error);
        // Handle error, e.g., show an error message to the user
      }
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
        className={showForm ? "join join-vertical" : "hidden"}
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <input
          {...register("songName", { required: true })}
          placeholder="Song name"
          className="input join-item"
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
          className="file-input join-item"
        />
        <button className="btn join-item" type="submit">
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
