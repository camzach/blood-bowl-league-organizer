import { data, useRouteLoaderData } from "react-router";
import fetchTeam from "./fetch-team";
import { authContext } from "~/app/primary-layout";
import { Route } from "./+types/loader";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { teamId } = params;
  const { session } = context.get(authContext)!;

  const team = await fetchTeam(teamId, false);

  if (!team || team.leagueId !== (session.activeOrganizationId as string)) {
    throw data({}, { status: 404 });
  }

  const isEditable = team.coaches.some((c) => c.id === session.userId);

  return { team, isEditable };
}

export function useTeamLoaderData() {
  const data = useRouteLoaderData<typeof loader>("routes/team/loader");
  if (!data) {
    throw new Error("useTeamLoaderData must be used within a team route");
  }
  return data;
}
