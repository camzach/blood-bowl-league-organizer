import { TeamsPage } from './team-page';
import type React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Header } from './header';
import { GamePage } from './game-page';
import { styled } from '@linaria/react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  & > :nth-child(2) {
    flex: 1;
  }
`;

export function App(): React.ReactElement {
  return (
    <Container>
      <Header />
      <Routes>
        <Route element={<TeamsPage />} path="/teams/*" />
        <Route element={<GamePage />} path="/game/*" />
      </Routes>
    </Container>
  );
}
