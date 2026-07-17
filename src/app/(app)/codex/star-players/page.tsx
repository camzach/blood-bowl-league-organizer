import { db } from "~/utils/drizzle";
import StarPlayersClientPage from "./star-players-client-page";
import { auth } from "~/auth";
import { headers } from "next/headers";

export default async function StarPlayersPage() {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  const leagueId = apiSession?.session?.activeOrganizationId;

  const starPlayers = await db.query.starPlayer.findMany({
    with: { skills: true, specialRules: true },
    orderBy: { name: "asc" },
  });

  const teams = leagueId
    ? await db.query.team.findMany({
        where: { leagueId },
        with: {
          roster: {
            with: {
              specialRules: true,
            },
          },
          specialRuleChoice: true,
        },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <StarPlayersClientPage
      starPlayers={starPlayers.map((s) => ({
        ...s,
        playsFor: s.specialRules.map((rule) => rule.name),
      }))}
      teams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        rosterSpecialRules: t.roster.specialRules
          .filter((sr) => sr.visible)
          .map((sr) => sr.name),
        chosenSpecialRule: t.chosenSpecialRuleName,
      }))}
    />
  );
}
