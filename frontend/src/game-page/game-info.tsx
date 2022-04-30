import type React from 'react';
import { styled } from '@linaria/react';
import { TeamTable } from '../team-table';
import { useGameQuery } from './game.query.gen';
import { useSearchParams } from 'react-router-dom';

const Container = styled.div`
  display: flex;
  padding: 2em;
  width: 100%;
  height: 100%;
  gap: 2em;
  overflow: scroll;
`;
const TeamContainer = styled.div`
  flex: 1;
  color: black;
`;
const TableContainer = styled.div`
  max-height: 50%;
  overflow: scroll;
  border: 1px solid black;
`;
const Score = styled.div`
  flex-basis: 200px;
  text-align: center;
  align-self: center;
`;

export function GameInfo(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const { isLoading, isError, data } = useGameQuery({
    home: searchParams.get('home'),
    away: searchParams.get('away'),
  });

  if (isLoading) return <>Loading...</>;
  if (isError || !data?.game) return <>Failed to load team info</>;

  const { game } = data;
  const { homeTeam, awayTeam } = game;

  return (
    <Container>
      <TeamContainer>
        <TableContainer>
          <TeamTable cols={['#', 'Name', 'Position', 'Skills', 'MA', 'ST', 'PA', 'AG', 'AV']} team={homeTeam} />
        </TableContainer>
      </TeamContainer>
      <Score>
        Touchdowns
        <br />
        {game.tdHome} - {game.tdAway}
        <br />
        Casualties
        <br />
        {game.casHome} - {game.casAway}
      </Score>
      <TeamContainer>
        <TableContainer>
          <TeamTable cols={['#', 'Name', 'Position', 'Skills', 'MA', 'ST', 'PA', 'AG', 'AV']} team={awayTeam} />
        </TableContainer>
      </TeamContainer>
    </Container>
  );
}
