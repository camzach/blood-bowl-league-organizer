"use client";
import { makeCaptain } from "./actions";
import { useRouter } from "next/navigation";

type Props = {
  playerId: string;
  disabled: boolean;
};

export default function CaptainButton({ playerId, disabled }: Props) {
  const router = useRouter();
  return (
    <button
      className="btn"
      onClick={async () => {
        await makeCaptain({ playerId });
        router.refresh();
      }}
      disabled={disabled}
    >
      Make Captain
    </button>
  );
}
