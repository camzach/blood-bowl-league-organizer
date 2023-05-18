"use client";
import { Die } from "components/die";
import { useRouter } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";
import { trpc } from "utils/trpc";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  team: string;
};

export default function ReadyButton({ team }: Props): ReactElement {
  const router = useRouter();
  const popup = useRef<HTMLDialogElement>(null);
  const { startMutation, endMutation, isMutating } = useServerMutation(false);
  const [response, setResponse] = useState<
    Awaited<ReturnType<typeof trpc.team.ready.mutate>> | null | undefined
  >(undefined);
  const readyTeam = (): void => {
    startMutation();
    void trpc.team.ready.mutate(team).then((res) => {
      setResponse(res);
      popup.current?.showModal();
      endMutation();
    });
  };

  return (
    <>
      <dialog ref={popup}>
        {((): ReactNode => {
          switch (response) {
            case null:
            case undefined:
              return "sus";
            default:
              return (
                <>
                  <Die result={response.expensiveMistakeRoll} />
                  {response.expensiveMistake} - Lost{" "}
                  {response.expensiveMistakesCost} gold!
                  <button
                    onClick={(): void => {
                      popup.current?.close();
                      router.refresh();
                    }}
                  >
                    OK
                  </button>
                </>
              );
          }
        })()}
      </dialog>
      {isMutating ? (
        "Submitting..."
      ) : (
        <button className="btn" onClick={readyTeam}>
          Ready for next game
        </button>
      )}
    </>
  );
}