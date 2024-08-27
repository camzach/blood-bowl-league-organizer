"use client";
import { useRouter } from "next/navigation";
import { update } from "./actions";
import { useAction } from "next-safe-action/hooks";

type Props = {
  id: string;
  number: number;
};

export default function PlayerNumberSelector({ id, number }: Props) {
  const router = useRouter();
  const { execute, status } = useAction(update, {
    onSuccess() {
      router.refresh();
    },
  });

  if (status === "executing") return <>Updating...</>;

  return (
    <select
      className="select select-bordered select-sm"
      value={number}
      onChange={(e): void => {
        execute({ player: id, number: parseInt(e.target.value, 10) });
      }}
    >
      {Array.from(Array(16), (_, idx) => (
        <option key={idx} value={idx + 1}>
          {idx + 1}
        </option>
      ))}
    </select>
  );
}
