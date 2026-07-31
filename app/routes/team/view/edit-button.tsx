"use client";

import { Link } from "react-router";

type Props = {
  teamId: string;
};
export default function EditButton({ teamId }: Props) {
  return (
    <span className="text-lg">
      {" - "}
      <Link className="link" to={`/team/${teamId}/edit`}>
        Edit
      </Link>
    </span>
  );
}
