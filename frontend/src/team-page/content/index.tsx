import type React from 'react';
import { useParams } from 'react-router-dom';
import { TeamTable } from '../../team-table';
import { useTeamQuery } from './team.query.gen';

export function Content(): React.ReactElement {
  const { team: teamParam } = useParams();
  const { isLoading, isError, data } = useTeamQuery({ name: teamParam ?? '' });

  if (isLoading) return <>Loading...</>;
  if (isError || !data?.team) return <>Failed to load team info</>;

  return (
    <section>
      <h1>{data.team.name}</h1>
      <TeamTable team={data.team} />
    </section>
  );
}
