"use client";
import { useEffect, useState } from "react";
import useServerMutation from "utils/use-server-mutation";
import { fire } from "./actions";
import { hireExistingPlayer } from "../actions";

type Props = {
  id: string;
  mode: "hire" | "fire";
};

export default function PlayerFirer({ id, mode }: Props) {
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

  const handleFire = (): void => {
    startMutation(async () => {
      try {
        return fire({ playerId: id });
      } catch {
        setError(true);
      }
    });
  };
  const handleHire = (): void => {
    startMutation(async () => {
      try {
        return hireExistingPlayer({
          player: id,
          number: 1,
        });
      } catch {
        setError(true);
      }
    });
  };

  if (mode === "fire") {
    if (isMutating) return <>Firing...</>;

    if (error) return <>Failed to fire player</>;

    return (
      <button
        className="btn btn-secondary btn-outline btn-sm"
        onClick={handleFire}
      >
        Fire!
      </button>
    );
  } else {
    if (isMutating) return <>Firing...</>;

    if (error) return <>Failed to fire player</>;

    return (
      <button
        className="btn btn-success btn-outline btn-sm"
        onClick={handleHire}
      >
        Hire!
      </button>
    );
  }
}
