"use client";
import { useSession } from "next-auth/react";

type Props = {
  teamName: string;
};
export default function EditButton({ teamName }: Props) {
  const session = useSession();
  if (session.data?.user.teams.includes(teamName))
    return (
      <span className="text-lg">
        {" - "}
        <a className="link" href={`/team/${teamName}/edit`}>
          Edit
        </a>
      </span>
    );
  return null;
}
