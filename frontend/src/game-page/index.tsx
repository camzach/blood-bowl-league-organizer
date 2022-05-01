import type React from 'react';
import { Route, Routes } from 'react-router-dom';
import { GameInfo } from './game-info';
import { NewGame } from './new-game';
import { Schedule } from './schedule';

export function GamePage(): React.ReactElement {
  return (
    <main>
      <Routes>
        <Route element={<Schedule />} path="/" />
        <Route element={<GameInfo />} path="/game" />
        <Route element={<NewGame />} path="/newgame" />
      </Routes>
    </main>
  );
}
