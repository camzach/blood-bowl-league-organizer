"use client";
import { useEffect, useState } from "react";
import useServerMutation from "utils/use-server-mutation";
import { fire } from "app/team/[teamName]/edit/actions";

type Props = {
  id: string;
};

export default function PlayerFirer({ id }: Props) {
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
