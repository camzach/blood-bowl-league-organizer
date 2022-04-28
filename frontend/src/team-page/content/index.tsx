import type React from 'react';
import { useParams } from 'react-router-dom';
import { TeamTable } from '../../team-table';
import { useTeamQuery } from './team.query.gen';

export function Content(): React.ReactElement {
  const { team: teamParam } = useParams();
  const { isLoading, isError, data } = useTeamQuery({ name: teamParam ?? '' });

  if (isLoading || !data?.team) return <>Loading...</>;
  if (isError) return <>Failed to load team info</>;

  const teamInfo = data.team;

  return (
    <section>
      <h2>{teamInfo.name}</h2>
      <TeamTable team={teamInfo} />
    </section>
  );
}
