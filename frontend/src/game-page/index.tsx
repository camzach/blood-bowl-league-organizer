// import { styled } from '@linaria/react';
import type React from 'react';
import { useFetch } from '../fetch';
import { GameInfo } from './game-info';

// const SeasonList = styled.ol`
//   list-style: none;
//   padding: 0;
//   margin: 0;

//   & > li:not(:first-child) {
//     margin-top: 2em;
//   }
// `;
// const RoundList = styled.ul`
//   list-style: none;
//   padding: 0;
//   margin: 0;
//   background-color: lightblue;
//   border-radius: 2em;

//   & > li {
//     display: flex;
//     justify-content: center;

//     &:not(:first-child) {
//       margin-top: 1em;
//     }
//   }
// `;
// const Home = styled.span`
//   text-align: right;
//   flex-basis: 100%;
// `;
// const Away = styled.span`
//   text-align: left;
//   flex-basis: 100%;
// `;
// const Vs = styled.span`
//   text-align: center;
//   flex-basis: 1ch;
//   margin-inline: 1ch;
// `;

export function GamePage(): React.ReactElement {
  // const [loading, error, games] = useFetch<Array<Array<[string, string]>>>('http://localhost:3000/games');

  // if (loading || !games) return <>Loading...</>;
  // if (error) return <>Error</>;

  return (
    <GameInfo />
    // <SeasonList>
    //   {games.map((round, roundidx) => (
    //     // eslint-disable-next-line react/no-array-index-key
    //     <li key={roundidx}>
    //       <RoundList>
    //         {round.map(([home, away]) => {
    //           const contents = <><Home>{home}</Home><Vs>-</Vs><Away>{away}</Away></>;
    //           return (
    //             // eslint-disable-next-line react/no-array-index-key
    //             <li key={`${home}-${away}-${roundidx}`}>
    //               {contents}
    //             </li>
    //           );
    //         })}
    //       </RoundList>
    //     </li>))}
    // </SeasonList>
  );
}
