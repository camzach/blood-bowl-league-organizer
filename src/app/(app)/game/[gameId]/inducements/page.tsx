import { notFound, redirect } from "next/navigation";
import Content from "./content";
import { db } from "~/utils/drizzle";
import { inducement, specialRuleToStarPlayer, starPlayer } from "~/db/schema";
import { eq, getColumns, inArray } from "drizzle-orm";
import { gameDetailsWithTeamTreasury } from "~/db/query-fragments/game.fragments";

async function getInducementOptions(rules: string[], rosterName: string) {
  const allInducements = await db.select().from(inducement);

  const inducementsPromise = allInducements
    .map((i) => {
      let price = i.price;
      if (i.specialPriceRosterName === rosterName) {
        price = i.specialPrice;
      } else if (
        i.specialPriceRuleName &&
        rules.includes(i.specialPriceRuleName)
      ) {
        price = i.specialPrice;
      }

      let max = i.max;
      if (i.specialMaxRuleName && rules.includes(i.specialMaxRuleName)) {
        max = i.specialMax as number;
      }

      return {
        ...i,
        price: price as number,
        max,
      };
    })
    .filter((i) => i.price !== null);

  const starsPromise = db
    .selectDistinct(getColumns(starPlayer))
    .from(starPlayer)
    .leftJoin(
      specialRuleToStarPlayer,
      eq(starPlayer.name, specialRuleToStarPlayer.starPlayerName),
    )
    .where(inArray(specialRuleToStarPlayer.specialRuleName, rules))
    .orderBy(starPlayer.name);

  return Promise.all([inducementsPromise, starsPromise]).then(
    ([inducements, stars]) => ({
      inducements,
      stars,
    }),
  );
}

const detailsSelection = gameDetailsWithTeamTreasury;

export default async function Inducements(props: {
  params: Promise<{ gameId: string }>;
}) {
  const params = await props.params;

  const { gameId } = params;

  const game = await db.query.game.findFirst({
    where: { id: decodeURIComponent(gameId) },
    columns: {
      state: true,
      homeDetailsId: true,
      awayDetailsId: true,
    },
    with: {
      homeDetails: detailsSelection,
      awayDetails: detailsSelection,
    },
  });
  if (!game) return notFound();
  if (!game.homeDetails || !game.awayDetails) return notFound();

  if (game.state !== "inducements") {
    if (game.state === "complete") {
      redirect(`/game/${gameId}`);
    } else {
      redirect(
        `/game/${gameId}/${game.state.toLowerCase() as typeof game.state}`,
      );
    }
  }

  function getTeamSpecialRules(
    team: NonNullable<
      NonNullable<typeof game>[`${"home" | "away"}Details`]
    >["team"],
  ) {
    const rules = team.roster.specialRuleToRoster.map((r) => r.specialRuleName);
    if (team.chosenSpecialRuleName) rules.push(team.chosenSpecialRuleName);
    return rules;
  }

  const homeOptions = await getInducementOptions(
    getTeamSpecialRules(game.homeDetails.team),
    game.homeDetails.team.roster.name,
  );
  const awayOptions = await getInducementOptions(
    getTeamSpecialRules(game.awayDetails.team),
    game.awayDetails.team.roster.name,
  );

  return (
    <Content
      inducements={[homeOptions.inducements, awayOptions.inducements]}
      stars={[homeOptions.stars, awayOptions.stars]}
      pettyCash={[
        game.homeDetails.pettyCashAwarded,
        game.awayDetails.pettyCashAwarded,
      ]}
      treasury={[
        game.homeDetails.team.treasury,
        game.awayDetails.team.treasury,
      ]}
      gameId={gameId}
      teams={[game.homeDetails.team.name, game.awayDetails.team.name]}
    />
  );
}
