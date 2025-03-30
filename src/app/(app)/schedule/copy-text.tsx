"use client";

import { useRouter } from "next/router";
import { useRef } from "react";

type Props = {
  teams: string | string[] | undefined;
};

export default function CopyText({ teams }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (!ref.current) return;

    navigator.clipboard.writeText(ref.current.value);
  }

  const router = useRouter();
  const text = router.basePath;

  return (
    <input ref={ref} onClick={handleClick} value={text} onChange={() => {}} />
  );
}
