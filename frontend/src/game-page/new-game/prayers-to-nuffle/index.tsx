import React from 'react';
import { gameContext } from '../game-context';

export function PrayersToNuffle(): React.ReactElement {
  const { gameInfo: { home, away }, dispatch } = React.useContext(gameContext);
  const handleResult = React.useCallback(() => {
    dispatch({ type: 'prayersToNuffle' });
  }, [dispatch]);
  const prayersHome = Math.max(0, Math.floor((away.currentTeamValue - home.currentTeamValue) / 50_000));
  const prayersAway = Math.max(0, Math.floor((home.currentTeamValue - away.currentTeamValue) / 50_000));
  return <button type="button" onClick={handleResult}>{prayersHome} - {prayersAway}</button>;
}
