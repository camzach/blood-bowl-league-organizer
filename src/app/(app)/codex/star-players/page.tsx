import { db } from "~/utils/drizzle";
import StarPlayersClientPage from "./star-players-client-page";
import { auth } from "~/auth";
import { headers } from "next/headers";
import { team } from "~/db/schema/bblo";
import { eq } from "drizzle-orm";

export default async function StarPlayersPage() {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  const leagueId = apiSession?.session?.activeOrganizationId;

  const starPlayers = await db.query.starPlayer.findMany({
    with: {
      skillToStarPlayer: {
        with: {
          skill: true,
        },
      },
      specialRuleToStarPlayer: {
        with: {
          specialRule: true,
        },
      },
    },
  });

  const teams = leagueId
    ? await db.query.team.findMany({
        where: eq(team.leagueId, leagueId),
        with: {
          roster: {
            with: {
              specialRuleToRoster: {
                with: {
                  specialRule: true,
                },
              },
            },
          },
          specialRuleChoice: true,
        },
      })
    : [];

  return (
    <StarPlayersClientPage
      starPlayers={starPlayers.map((s) => ({
        ...s,
        name: s.name,
        skills: s.skillToStarPlayer.map((sts) => sts.skill),
        playsFor: s.specialRuleToStarPlayer.map((srs) => srs.specialRule.name),
      }))}
      teams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        rosterSpecialRules: t.roster.specialRuleToRoster
          .filter((sr) => sr.specialRule.visible)
          .map((sr) => sr.specialRuleName),
        chosenSpecialRule: t.chosenSpecialRuleName,
      }))}
    />
  );
}