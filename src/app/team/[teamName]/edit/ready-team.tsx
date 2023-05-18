"use client";
import { Die } from "components/die";
import { Modal } from "components/modal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "utils/trpc";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  team: string;
};

export default function ReadyButton({ team }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { startMutation, endMutation, isMutating } = useServerMutation(false);
  const [response, setResponse] = useState<
    Awaited<ReturnType<typeof trpc.team.ready.mutate>> | null | undefined
  >(undefined);
  const readyTeam = (): void => {
    startMutation();
    void trpc.team.ready.mutate(team).then((res) => {
      setResponse(res);
      setIsOpen(true);
      endMutation();
    });
  };

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        {(() => {
          switch (response) {
            case null:
            case undefined:
              return null;
            default:
              return (
                <>
                  <Die result={response.expensiveMistakeRoll} />
                  {response.expensiveMistake} - Lost{" "}
                  {response.expensiveMistakesCost} gold!
                  <button
                    onClick={(): void => {
                      setIsOpen(false);
                      router.refresh();
                    }}
                  >
                    OK
                  </button>
                </>
              );
          }
        })()}
      </Modal>
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
