import type React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inducements } from './inducements';
import { usePregameInfoQuery } from './team-values.query.gen';

export function NewGame(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const home = searchParams.get('home');
  const away = searchParams.get('away');

  const { isLoading, isError, data } = usePregameInfoQuery({ home, away });

  if (home === null || away === null) {
    return (
      <>
        <p>Home and Away teams not specified.</p>
        <p>Please return to the schedule page and select the game to be played.</p>
      </>
    );
  }

  if (isLoading) return <>Loading...</>;
  if (isError ||
    !data ||
    !data.home ||
    !data.away
  ) return <>Error</>;

  return (
    <Inducements away={data.away} home={data.home} />
  );
}
