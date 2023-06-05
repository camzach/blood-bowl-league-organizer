"use client";
import { useEffect, useState } from "react";
import useServerMutation from "utils/use-server-mutation";
import { hireExistingPlayer } from "../actions";

type Props = {
  player: string;
  number: number;
  team: string;
  from: "redrafts" | "journeymen";
};

export default function PlayerFirer({ player, number, team, from }: Props) {
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
      return hireExistingPlayer({ player, number, team, from }).catch(() => {
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
