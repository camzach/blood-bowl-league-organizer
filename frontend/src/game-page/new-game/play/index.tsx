import { styled } from '@linaria/react';
import React from 'react';
import { gameContext } from '..';
import { TeamTable } from '../../../team-table';
import { combinePlayers } from './utils';

const Container = styled.div`
  display: flex;
  justify-content: space-evenly;

  table {
    max-width: 25%;
  }
`;

const teamCols = ['#', 'Name', 'Position', 'Skills', 'MA', 'ST', 'PA', 'AG', 'AV', 'NI'] as const;
export function Play(): React.ReactElement {
  const { gameInfo, dispatch } = React.useContext(gameContext);

  const [homePlayers, awayPlayers] = React.useMemo(() => {
    const home = combinePlayers(gameInfo.home.players);
    const away = combinePlayers(gameInfo.away.players);
    return [home, away];
  }, [gameInfo.away.players, gameInfo.home.players]);

  return (
    <Container>
      <TeamTable players={homePlayers} cols={teamCols} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <input type="number" />
        <span>
          <button type="button">&lt;</button>
          Touchdown
          <button type="button">&gt;</button>
        </span>
        <span>
          <button type="button">&lt;</button>
          Casualty
          <button type="button">&gt;</button>
        </span>
      </div>
      <TeamTable players={awayPlayers} cols={teamCols} />
    </Container>
  );
}
