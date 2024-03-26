"use client";

type Props = {
  teamId: string;
};
export default function EditButton({ teamId }: Props) {
  return (
    <span className="text-lg">
      {" - "}
      <a className="link" href={`/team/${teamId}/edit`}>
        Edit
      </a>
    </span>
  );
}
