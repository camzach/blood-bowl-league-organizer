import classNames from "classnames";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = { teamId: string; currentSong?: string; isEditable: boolean };

export default function SongControls({
  teamId,
  currentSong,
  isEditable,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const fetcher = useFetcher();
  
  useFetcherErrorNotification(fetcher);

  const isSubmitting = fetcher.state !== "idle";

  if (isSubmitting) return <div>Submitting song...</div>;

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
      <fetcher.Form
        method="post"
        action={`/team/${teamId}/song`}
        encType="multipart/form-data"
        className={showForm ? "join join-vertical" : "hidden"}
        onSubmit={() => setShowForm(false)}
      >
        <input type="hidden" name="teamId" value={teamId} />
        <input
          name="songName"
          placeholder="Song name"
          className="input join-item"
          required
        />
        <input
          name="file"
          type="file"
          accept="audio/*"
          className="file-input join-item"
          required
        />
        <button className="btn join-item" type="submit" disabled={isSubmitting}>
          Submit
        </button>
      </fetcher.Form>
    </>
  );

  return (
    <div>
      {currentSong !== undefined ? (
        <div className="flex items-center gap-2">
          <span>Touchdown song: {currentSong}</span>
          <audio controls src={`/songs/${teamId}`} className="max-w-xs">
            Your browser does not support the audio element.
          </audio>
        </div>
      ) : (
        "No touchdown song selected"
      )}
      {isEditable && editor}
    </div>
  );
}
