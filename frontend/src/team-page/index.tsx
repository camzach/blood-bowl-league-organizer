import type React from 'react';
import { Sidebar } from './sidebar';
import { styled } from '@linaria/react';
import { Content } from './content';
import { Route, Routes } from 'react-router-dom';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 5fr;
`;

const noTeam = <>Choose a team</>;

export function TeamsPage(): React.ReactElement {
  return (
    <Grid>
      <Sidebar />
      <main>
        <Routes>
          <Route element={noTeam} path="/" />
          <Route element={<Content />} path="/:team" />
        </Routes>
      </main>
    </Grid>
  );
}
