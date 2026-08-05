import { inducement, specialRule, starPlayer } from "~/db/schema";
import type { Transaction } from "~/app/utils/drizzle";

function getInducementPrice(
  inducement: {
    price: number | null;
    specialPrice: number | null;
    specialPriceRuleName: string | null;
    specialPriceRosterName: string | null;
  },
  specialRules: string[],
  rosterName: string,
): number | null {
  if (
    inducement.specialPriceRosterName &&
    inducement.specialPriceRosterName === rosterName &&
    inducement.specialPrice !== null
  ) {
    return inducement.specialPrice;
  }
  if (
    inducement.specialPriceRuleName !== null &&
    specialRules.includes(inducement.specialPriceRuleName) &&
    inducement.specialPrice !== null
  )
    return inducement.specialPrice;
  return inducement.price;
}

class InducementError extends Error {}

export function calculateInducementCostsFromData(
  inducements: Array<{ name: string; quantity: number }>,
  stars: Array<string>,
  specialRules: string[],
  playerCount: number,
  rosterName: string,
  starPlayersData: Array<
    typeof starPlayer.$inferSelect & {
      specialRules: Array<typeof specialRule.$inferSelect>;
    }
  >,
  inducementsData: Array<typeof inducement.$inferSelect>,
): number {
  if (stars.length > 2)
    throw new InducementError("Only 2 star players permitted");
  if (stars.length + playerCount > 16)
    throw new InducementError("Star players take the team above 16 players");

  const starPlayers = starPlayersData.filter((sp) => stars.includes(sp.name));

  if (starPlayers.length !== stars.length)
    throw new InducementError("Star player not recognized");

  let starPlayerCost = 0;
  for (const player of starPlayers) {
    if (
      !player.specialRules.some(({ name }) =>
        specialRules.some((r) => r === name),
      )
    )
      throw new InducementError("Invalid Star Player selected");

    if (player.partnerName !== null && !stars.includes(player.partnerName))
      throw new InducementError(
        `${player.name} and ${player.partnerName} must be hired together`,
      );

    starPlayerCost += player.hiringFee;
  }

  let inducementCost = 0;
  const inducementCounts: Record<string, number> = {};
  for (const inducement of inducements) {
    const foundInducement = inducementsData.find(
      (ind) => ind.name === inducement.name,
    );
    if (!foundInducement)
      throw new InducementError("Unknown inducement specified");

    if (!(inducement.name in inducementCounts))
      inducementCounts[inducement.name] = 0;
    inducementCounts[inducement.name] += inducement.quantity;

    let max = foundInducement.max;
    if (
      foundInducement.specialMaxRuleName &&
      specialRules.includes(foundInducement.specialMaxRuleName)
    ) {
      max = foundInducement.specialMax as number;
    }

    if (inducementCounts[inducement.name] > max)
      throw new InducementError("Inducement maximum exceeded");

    const cost = getInducementPrice(foundInducement, specialRules, rosterName);
    if (cost === null)
      throw new InducementError("Team cannot take the specified inducement");
    inducementCost += cost * inducement.quantity;
  }
  return inducementCost + starPlayerCost;
}

export async function calculateInducementCosts(
  inducements: Array<{ name: string; quantity: number }>,
  stars: Array<string>,
  specialRules: string[],
  playerCount: number,
  rosterName: string,
  tx: Transaction,
): Promise<number> {
  const starPlayersData = await tx.query.starPlayer.findMany({
    where: { name: { in: stars } },
    with: {
      specialRules: true,
    },
  });

  const inducementsData =
    inducements.length > 0
      ? await tx.query.inducement.findMany({
          where: {
            name: {
              in: inducements.map((ind) => ind.name),
            },
          },
        })
      : [];

  return calculateInducementCostsFromData(
    inducements,
    stars,
    specialRules,
    playerCount,
    rosterName,
    starPlayersData,
    inducementsData,
  );
}
