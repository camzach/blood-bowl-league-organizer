import { notFound, redirect } from "next/navigation";
import Content from "./content";
import { db } from "~/utils/drizzle";
import {
  game as dbGame,
  inducement,
  specialRuleToStarPlayer,
  starPlayer,
} from "~/db/schema";
import { eq, getTableColumns, inArray, isNotNull, or } from "drizzle-orm";

function getChoicesForSpecialRules(rules: string[]) {
  const inducements = db
    .select()
    .from(inducement)
    .where(
      or(
        isNotNull(inducement.price),
        inArray(inducement.specialPriceRule, rules),
      ),
    )
    .then((res) =>
      res.map((i) => ({
        ...i,
        price: (i.specialPriceRule !== null &&
        rules.includes(i.specialPriceRule)
          ? i.specialPrice
          : i.price) as number,
      })),
    );
  const stars = db
    .selectDistinct(getTableColumns(starPlayer))
    .from(starPlayer)
    .leftJoin(
      specialRuleToStarPlayer,
      eq(starPlayer.name, specialRuleToStarPlayer.starPlayerName),
    )
    .where(inArray(specialRuleToStarPlayer.specialRuleName, rules))
    .orderBy(starPlayer.name);
  return Promise.all([inducements, stars]).then(([inducements, stars]) => ({
    inducements,
    stars,
  }));
}

const detailsSelection = {
  with: {
    team: {
      columns: {
        treasury: true,
        name: true,
        chosenSpecialRuleName: true,
      },
      with: { roster: { with: { specialRuleToRoster: true } } },
    },
  },
} as const;

export default async function Inducements(props: {
  params: Promise<{ gameId: string }>;
}) {
  const params = await props.params;

  const { gameId } = params;

  const game = await db.query.game.findFirst({
    where: eq(dbGame.id, decodeURIComponent(gameId)),
    columns: {
      state: true,
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

  const homeOptions = await getChoicesForSpecialRules(
    getTeamSpecialRules(game.homeDetails.team),
  );
  const awayOptions = await getChoicesForSpecialRules(
    getTeamSpecialRules(game.awayDetails.team),
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
