import type React from 'react';
import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import { NavLink } from 'react-router-dom';
import imageUrl from './BBLogoIcon2018_web.png';

const Container = styled.header`
  width: 100%;
  max-height: 50px;
  flex-basis: 50px;
  flex-grow: 0;
  flex-shrink: 0;
  background-color: hsl(180 50% 45%);
`;
const Logo = styled.img`
  height: 100%;
  float: inline-start;
  margin-right: 2em;
  position: relative;
`;
const NavList = styled.nav`
  display: flex;
  gap: 2em;
  height: 100%;
  align-items: center;
  justify-content: space-around;
`;
const navItem = css`
  &.active {
    color: green;
  }
`;

export function Header(): React.ReactElement {
  return (
    <Container>
      <Logo alt="logo" src={imageUrl} />
      <NavList>
        <NavLink className={navItem} to="/teams">Teams</NavLink>
        <NavLink className={navItem} to="/league">League Table</NavLink>
        <NavLink className={navItem} to="/game">Games</NavLink>
      </NavList>
    </Container>
  );
}
