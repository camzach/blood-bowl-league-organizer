"use client";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { trpc } from "utils/trpc";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  id: string;
};

export default function PlayerFirer({ id }: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();
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
    startMutation();
    void trpc.player.fire
      .mutate(id)
      .catch(() => {
        setError(true);
      })
      .finally(endMutation);
  };

  if (isMutating) return <>Firing...</>;

  if (error) return <>Failed to fire player</>;

  return (
    <button
      className="btn-outline btn-secondary btn-sm btn"
      onClick={handleFire}
    >
      Fire!
    </button>
  );
}
