import type React from 'react';
import { styled } from '@linaria/react';
import { useScheduleQuery } from './games.query.gen';
import { Link } from 'react-router-dom';

const SeasonList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;

  & > li:not(:first-child) {
    margin-top: 2em;
  }
`;
const RoundList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: lightblue;
  border-radius: 2em;

  & > li {
    display: flex;
    justify-content: center;

    &:not(:first-child) {
      margin-top: 1em;
    }
  }
`;
const Home = styled.span`
  text-align: right;
  flex-basis: 100%;
`;
const Away = styled.span`
  text-align: left;
  flex-basis: 100%;
`;
const Vs = styled.span`
  text-align: center;
  flex-basis: 1ch;
  margin-inline: 1ch;
`;

export function Schedule(): React.ReactElement {
  const { isLoading, isError, data } = useScheduleQuery();

  if (isLoading) return <>Loading...</>;
  if (isError || !data) return <>Error</>;

  return (
    <main>
      <SeasonList>
        {data.schedule.rounds.map((round, roundIdx) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={roundIdx}>
            <RoundList>
              {round.games.map(game => {
                const { homeTeam, awayTeam } = game;
                // eslint-disable-next-line no-underscore-dangle
                const tdHome = game.game?.tdHome;
                // eslint-disable-next-line no-underscore-dangle
                const tdAway = game.game?.tdAway;
                const contents = (
                  <>
                    <Home>
                      {homeTeam.name}
                    </Home>
                    <Vs>{tdHome}-{tdAway}</Vs>
                    <Away>
                      {awayTeam.name}
                    </Away>
                  </>
                );
                return (
                  <li key={`${homeTeam.name}-${awayTeam.name}`}>
                    {/* eslint-disable-next-line no-underscore-dangle */}
                    {game.game
                      ? <Link to={`game/${game.game.id}`}>{contents}</Link>
                      : (
                        <>
                          <span>{contents}</span>
                          <Link to={`newgame?home=${homeTeam.id}&away=${awayTeam.id}`}>
                            Play it now
                          </Link>
                        </>
                      )}
                  </li>
                );
              })}
            </RoundList>
          </li>
        ))}
      </SeasonList>
    </main>
  );
}
