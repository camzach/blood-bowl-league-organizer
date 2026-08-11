"use client";
import { ChangeEvent, useCallback, useState } from "react";
import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  positions: Array<{ name: string; cost: number }>;
  treasury: number;
  freeNumbers: number[];
  teamId: string;
  disabled?: boolean;
};

export function PlayerHirer({
  positions,
  treasury,
  freeNumbers,
  teamId,
  disabled = false,
}: Props) {
  const fetcher = useFetcher();
  const [position, setPosition] = useState(positions[0]?.name ?? "");
  const [number, setNumber] = useState(freeNumbers[0] ?? 0);
  
  useFetcherErrorNotification(fetcher);

  if (freeNumbers.length > 0 && !freeNumbers.includes(number)) {
    setNumber(freeNumbers[0]);
  }

  if (!positions.some((pos) => pos.name === position))
    setPosition(positions[0]?.name);

  const handlePositionSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setPosition(e.target.value);
    },
    [],
  );

  const handleNumberSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isNaN(val)) return;
      setNumber(val);
    },
    [],
  );

  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  if (isSubmitting) return <>Hiring...</>;

  return (
    <>
    <div className="join">
      <select
        className="join-item select select-bordered"
        value={position}
        onChange={handlePositionSelect}
        disabled={disabled}
      >
        {positions.map((p) => (
          <option disabled={p.cost > treasury} key={p.name} value={p.name}>
            {p.name} - {p.cost}
          </option>
        ))}
      </select>
      <select
        className="join-item select select-bordered"
        value={number}
        onChange={handleNumberSelect}
        disabled={disabled}
      >
        {freeNumbers.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <button
        className="btn btn-primary join-item"
        onClick={() => 
          fetcher.submit(
            { action: "new", position, number: number.toString() },
            { method: "post", action: `/team/${teamId}/edit/hire-player` }
          )
        }
        disabled={disabled || isSubmitting}
      >
        HIRE!!!
      </button>
    </div>
    </>
  );
}
