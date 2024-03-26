"use client";
import { Die } from "components/die";
import { Modal } from "components/modal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ready } from "./actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  teamId: string;
};

export default function ReadyButton({ teamId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { execute, result, status } = useRefreshingAction(ready);

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        {status === "hasSucceeded" && result.data ? (
          <>
            <Die result={result.data.expensiveMistakeRoll} />
            {result.data.expensiveMistake} - Lost{" "}
            {result.data.expensiveMistakesCost} gold!
            <button
              onClick={(): void => {
                setIsOpen(false);
                router.refresh();
              }}
            >
              OK
            </button>
          </>
        ) : null}
      </Modal>
      {status === "executing" ? (
        "Submitting..."
      ) : (
        <button className="btn" onClick={() => execute(teamId)}>
          Ready for next game
        </button>
      )}
    </>
  );
}
