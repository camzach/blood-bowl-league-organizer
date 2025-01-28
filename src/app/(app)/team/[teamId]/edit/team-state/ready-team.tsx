"use client";
import { Die } from "components/die";
import { Modal } from "components/modal";
import { useRouter } from "next/navigation";
import { ready } from "../actions";
import { useAction } from "next-safe-action/hooks";

type Props = {
  teamId: string;
  showResult: boolean;
};

export default function ReadyButton({ teamId, showResult }: Props) {
  const router = useRouter();
  const { execute, result, status } = useAction(ready, {
    onSuccess() {
      if (!showResult) {
        router.refresh();
      }
    },
  });

  return (
    <>
      {showResult && status === "hasSucceeded" && result.data && (
        <Modal isOpen>
          <div className="flex flex-col">
            <Die result={result.data.expensiveMistakeRoll} />
            {result.data.expensiveMistake} - Lost{" "}
            {result.data.expensiveMistakesCost} gold!
            <button
              onClick={(): void => {
                router.refresh();
              }}
            >
              OK
            </button>
          </div>
        </Modal>
      )}
      {status === "executing" ? (
        "Submitting..."
      ) : (
        <button className="btn btn-primary" onClick={() => execute(teamId)}>
          Ready for next game
        </button>
      )}
    </>
  );
}
