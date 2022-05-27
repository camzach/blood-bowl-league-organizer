import React from 'react';
import { gameContext } from '../game-context';

export function Submit(): React.ReactElement {
  const { gameInfo } = React.useContext(gameContext);
  return (
    <>
      Done!
      <br />
      <pre>
        {JSON.stringify(gameInfo.results, undefined, '\t')}
      </pre>
    </>
  );
}
