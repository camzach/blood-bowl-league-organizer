"use client";

import Link from "next/link";

type Props = {
  teamId: string;
};
export default function EditButton({ teamId }: Props) {
  return (
    <span className="text-lg">
      {" - "}
      <Link className="link" href={`/team/${teamId}/edit`}>
        Edit
      </Link>
    </span>
  );
}
