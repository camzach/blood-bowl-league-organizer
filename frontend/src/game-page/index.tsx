import type React from 'react';
import { styled } from '@linaria/react';
import { useScheduleQuery } from './games.query.gen';

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
const GameLink = styled.a`
  &:focus {
    outline: 2px dashed red;
  }
`;

export function GamePage(): React.ReactElement {
  const { isLoading, isError, data } = useScheduleQuery();

  if (isLoading) return <>Loading...</>;
  if (isError || !data) return <>Error</>;

  return (
    <SeasonList>
      <li>
        {data.schedule.rounds.map(round => (
          <RoundList key="a">
            {round.games.map(game => {
              const { homeTeam, awayTeam } = game;
              // eslint-disable-next-line no-underscore-dangle
              const tdHome = game.__typename === 'Game' && game.tdHome;
              // eslint-disable-next-line no-underscore-dangle
              const tdAway = game.__typename === 'Game' && game.tdAway;
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
              // eslint-disable-next-line react/no-array-index-key
                <li key={`${homeTeam.name}-${awayTeam.name}`}>
                  {/* eslint-disable-next-line no-underscore-dangle */}
                  {game.__typename === 'Game'
                    ? <GameLink href="#test">{contents}</GameLink>
                    : <span>{contents}</span>}
                </li>
              );
            })}
          </RoundList>
        ))}
      </li>
    </SeasonList>
  );
}
