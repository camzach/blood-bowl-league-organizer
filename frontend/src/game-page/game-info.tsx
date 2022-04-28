import type React from 'react';
import { styled } from '@linaria/react';
import type { Team } from 'globals';
import { TeamTable } from '../team-table';
import { useFetch } from '../fetch';

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
  const [gameLoading, gameError, game] = useFetch<Record<string, unknown>>('http://localhost:3000/games/1/Antivaxxers');
  const [homeLoading, homeError, home] = useFetch<Team>(`http://localhost:3000/teams/${game?.home}`);
  const [awayLoading, awayError, away] = useFetch<Team>(`http://localhost:3000/teams/${game?.away}`);
  console.log(game, home, away);

  if (gameLoading || homeLoading || awayLoading || !game || !home || !away) return <>Loading...</>;
  if (gameError || homeError || awayError) return <>Failed to load team info</>;

  return (
    <Container>
      <TeamContainer>
        <TableContainer>
          <TeamTable cols={['#', 'Name', 'Position', 'Skills', 'MA', 'ST', 'PA', 'AG', 'AV']} team={home} />
        </TableContainer>
      </TeamContainer>
      <Score>
        Touchdowns
        <br />
        {game.tdHome as string} - {game.tdAway as string}
        <br />
        Casualties
        <br />
        {game.casHome as string} - {game.casAway as string}
      </Score>
      <TeamContainer>
        <TableContainer>
          <TeamTable cols={['#', 'Name', 'Position', 'Skills', 'MA', 'ST', 'PA', 'AG', 'AV']} team={away} />
        </TableContainer>
      </TeamContainer>
    </Container>
  );
}
