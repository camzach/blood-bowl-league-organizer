"use client";
import { useEffect, useState } from "react";
import { trpc } from "utils/trpc";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  player: string;
  number: number;
  team: string;
};

export default function PlayerFirer({ player, number, team }: Props) {
  const { startMutation, isMutating } = useServerMutation();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (error && !isMutating) {
      const timeout = setTimeout(() => {
        setError(false);
      }, 1500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [error, isMutating]);

  const handleHire = (): void => {
    startMutation(() => {
      return trpc.team.hireExistingPlayer
        .mutate({ player, number, team })
        .catch(() => {
          setError(true);
        });
    });
  };
  if (isMutating) return <>Hiring...</>;

  if (error) return <>Failed to hire. Please try again</>;

  return (
    <button
      className="btn-bordered btn-primary btn-sm btn"
      onClick={handleHire}
    >
      Hire!
    </button>
  );
}
