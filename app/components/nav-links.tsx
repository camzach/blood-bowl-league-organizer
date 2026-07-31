"use client";

import { Link } from "react-router";
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
            <Link to="/codex/skills">Skills</Link>
          </li>
          <li>
            <Link to="/codex/star-players">Star Players</Link>
          </li>
        </NavDropdown>
      </li>
      <li>
        <NavDropdown title="Teams">
          {props.teams.map((team) => (
            <li key={team.id}>
              <Link to={`/team/${team.id}`}>{team.name}</Link>
            </li>
          ))}
        </NavDropdown>
      </li>
      <li>
        <Link to="/schedule">Schedule</Link>
      </li>
      <li>
        <Link to="/league-table">League Table</Link>
      </li>
      {props.showPlayoffsLink && (
        <li>
          <Link to="/playoffs">Playoffs</Link>
        </li>
      )}
      {props.isAdmin && (
        <li>
          <Link to="/admin">Admin</Link>
        </li>
      )}
    </ul>
  );
}
