import { inducement, starPlayer } from "db/schema";
import { inArray } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import type { db, Transaction } from "utils/drizzle";

function getInducementPrice(
  inducement: {
    price: number | null;
    specialPrice: number | null;
    specialPriceRule: string | null;
  },
  specialRules: string[],
): number | null {
  if (
    inducement.specialPriceRule !== null &&
    specialRules.includes(inducement.specialPriceRule)
  )
    return inducement.specialPrice as number;
  return inducement.price;
}

class InducementError extends Error {}

export async function calculateInducementCosts(
  inducements: Array<{ name: string; quantity: number }>,
  stars: Array<string>,
  specialRules: string[],
  playerCount: number,
  tx: Transaction,
): Promise<number> {
  if (stars.length > 2)
    throw new InducementError("Only 2 star players permitted");
  if (stars.length + playerCount > 16)
    throw new InducementError("Star players take the team above 16 players");

  const starPlayers =
    stars.length > 0
      ? await tx.query.starPlayer.findMany({
          where: inArray(starPlayer.name, stars),
          with: {
            specialRuleToStarPlayer: true,
          },
        })
      : [];
  if (starPlayers.length !== stars.length)
    throw new InducementError("Star player not recognized");

  let starPlayerCost = 0;
  for (const player of starPlayers) {
    if (
      !player.specialRuleToStarPlayer.some(({ specialRuleName: rule }) =>
        specialRules.some((r) => r === rule),
      )
    )
      throw new InducementError("Invalid Star Player selected");

    if (player.partnerName !== null && !stars.includes(player.partnerName))
      throw new InducementError(
        `${player.name} and ${player.partnerName} must be hired together`,
      );

    starPlayerCost += player.hiringFee;
  }

  const chosenInducements =
    inducements.length > 0
      ? await tx.query.inducement.findMany({
          where: inArray(
            inducement.name,
            inducements.map((ind) => ind.name),
          ),
        })
      : [];

  let inducementCost = 0;
  const inducementCounts: Record<string, number> = {};
  for (const inducement of inducements) {
    const foundInducement = chosenInducements.find(
      (ind) => ind.name === inducement.name,
    );
    if (!foundInducement)
      throw new InducementError("Unknown inducement specified");

    if (!(inducement.name in inducementCounts))
      inducementCounts[inducement.name] = 0;
    inducementCounts[inducement.name] += 1;

    if (inducementCounts[inducement.name] > foundInducement.max)
      throw new InducementError("Inducement maximum exceeded");

    const cost = getInducementPrice(foundInducement, specialRules);
    if (cost === null)
      throw new InducementError("Team cannot take the specified inducement");
    inducementCost += cost;
  }
  return inducementCost + starPlayerCost;
}
