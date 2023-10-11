"use client";

type Props = {
  teamName: string;
};
export default function EditButton({ teamName }: Props) {
  return (
    <span className="text-lg">
      {" - "}
      <a className="link" href={`/team/${teamName}/edit`}>
        Edit
      </a>
    </span>
  );
}
