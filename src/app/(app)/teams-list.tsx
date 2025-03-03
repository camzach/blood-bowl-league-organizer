"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type Props = {
  teams: Array<{ id: string; name: string }>;
};
export default function TeamsList({ teams }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current) return;
      if (
        !ref.current.contains(e.target as Node) ||
        (e.target as Node).nodeName === "A"
      ) {
        ref.current.open = false;
      }
    };
    document.body.addEventListener("click", listener);
    return () => {
      document.body.removeEventListener("click", listener);
    };
  }, []);
  return (
    <details ref={ref}>
      <summary>Teams</summary>
      <ul className="z-1 w-max max-w-xs bg-base-200 p-2 shadow-xl">
        {teams.map((team) => (
          <li key={team.id}>
            <Link href={`/team/${team.id}`}>{team.name}</Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
