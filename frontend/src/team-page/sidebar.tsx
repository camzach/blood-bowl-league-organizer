import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import type React from 'react';
import { NavLink } from 'react-router-dom';
import { useTeamNamesQuery } from './team-names.query.gen';

const NavList = styled.nav`
  padding: 0;
  margin: 0;
  list-style: none;
  width: 100%;
  height: 100%;
  background-color: lightblue;
  display: flex;
  flex-direction: column;
`;

const navLinkStyle = css`
  &.active {
    color: black;
    font-weight: 900;
    background-color: hsl(180 50% 45%);
  }
`;

export function Sidebar(): React.ReactElement {
  const { data } = useTeamNamesQuery();
  const teamnames = data?.teams.map(t => t.name);
  return (
    <NavList>
      {teamnames?.map(teamname => (
        <NavLink key={teamname} className={navLinkStyle} to={encodeURI(`/teams/${teamname}`)}>{teamname}</NavLink>
      ))}
    </NavList>
  );
}
