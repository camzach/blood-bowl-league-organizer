"use client";

import Link from "next/link";
import NavDropdown from "./nav-dropdown";

export default function NavLinks(props: {
  teams: Array<{ name: string; id: string }>;
  showPlayoffsLink: boolean;
  isAdmin: boolean;
}) {
  return (
    <ul className="menu md:menu-horizontal text-xl">
      <li>
        <NavDropdown title="Codex">
          <li>
            <Link href="/codex/skills">Skills</Link>
          </li>
          <li>
            <Link href="/codex/star-players">Star Players</Link>
          </li>
        </NavDropdown>
      </li>
      <li>
        <NavDropdown title="Teams">
          {props.teams.map((team) => (
            <li key={team.id}>
              <Link href={`/team/${team.id}`}>{team.name}</Link>
            </li>
          ))}
        </NavDropdown>
      </li>
      <li>
        <Link href="/schedule">Schedule</Link>
      </li>
      <li>
        <Link href="/league-table">League Table</Link>
      </li>
      {props.showPlayoffsLink && (
        <li>
          <Link href="/playoffs">Playoffs</Link>
        </li>
      )}
      {props.isAdmin && (
        <li>
          <Link href="/admin">Admin</Link>
        </li>
      )}
    </ul>
  );
}
