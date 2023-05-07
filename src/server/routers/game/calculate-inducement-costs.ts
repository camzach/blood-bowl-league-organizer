import type {
  Inducement,
  InducementOption,
  PrismaClient,
} from "@prisma/client/edge";

const twoForOnePairs = [
  ["Grak", "Crumbleberry"],
  ["Lucian Swift", "Valen Swift"],
  ["Dribl", "Drull"],
];

function getInducementPrice(
  inducement: Inducement | InducementOption,
  specialRules: string[]
): number | null {
  if (
    inducement.specialPriceRuleName !== null &&
    specialRules.includes(inducement.specialPriceRuleName)
  )
    return inducement.specialPrice as number;
  return inducement.price;
}

class InducementError extends Error {}

export async function calculateInducementCosts(
  selections: Array<{ name: string; quantity: number; option?: string }>,
  specialRules: string[],
  playerCount: number,
  prisma: PrismaClient
): Promise<number> {
  const starPlayerNames = selections
    .filter((ind) => ind.name === "Star Player")
    .map((p) => p.option as string);
  if (starPlayerNames.length > 2)
    throw new InducementError("Only 2 star players permitted");
  if (starPlayerNames.length + playerCount > 16)
    throw new InducementError("Star players take the team above 16 players");

  const starPlayers = await prisma.starPlayer.findMany({
    where: { name: { in: starPlayerNames } },
    select: {
      name: true,
      hiringFee: true,
      playsFor: { select: { name: true } },
    },
  });
  if (starPlayers.length !== starPlayerNames.length)
    throw new InducementError("Star player not recognized");

  let starPlayerCost = 0;
  for (const player of starPlayers) {
    if (
      player.playsFor.length > 0 &&
      !player.playsFor.some(({ name: rule }) =>
        specialRules.some((r) => r === rule)
      )
    )
      throw new InducementError("Invalid Star Player selected");

    starPlayerCost += player.hiringFee;
  }
  // Two for One check
  for (const [playerA, playerB] of twoForOnePairs) {
    if (
      starPlayers.map((p) => p.name).includes(playerA) !==
      starPlayers.map((p) => p.name).includes(playerB)
    )
      throw new InducementError(
        `${playerA} and ${playerB} must be hired together`
      );
  }

  const nonStarInducements = selections.filter(
    (ind) => ind.name !== "Star Player"
  );
  const chosenInducements = await prisma.inducement.findMany({
    where: { name: { in: nonStarInducements.map((ind) => ind.name) } },
    include: {
      options: {
        where: {
          name: {
            in: nonStarInducements
              .map((ind) => ind.option)
              .filter((opt): opt is string => opt !== undefined),
          },
        },
      },
    },
  });

  let inducementCost = 0;
  const inducementCounts: Record<string, number> = {};
  for (const inducement of nonStarInducements) {
    const foundInducement = chosenInducements.find(
      (ind) => ind.name === inducement.name
    );
    if (!foundInducement)
      throw new InducementError("Unknown inducement specified");

    if (!(inducement.name in inducementCounts))
      inducementCounts[inducement.name] = 0;
    inducementCounts[inducement.name] += 1;

    if (inducementCounts[inducement.name] > foundInducement.max)
      throw new InducementError("Inducement maximum exceeded");

    const cost = getInducementPrice(foundInducement, specialRules);
    if (cost === null && foundInducement.specialPriceRuleName === null) {
      if (inducement.option === undefined)
        throw new InducementError("Inducement requires an option");

      const foundOption = foundInducement.options.find(
        (opt) => opt.name === inducement.option
      );
      if (!foundOption) throw new InducementError("Invalid inducement option");

      const optionCost = getInducementPrice(foundOption, specialRules);
      if (optionCost === null)
        throw new InducementError("Team cannot take the specified inducement");

      inducementCost += optionCost;
    } else {
      if (cost === null)
        throw new InducementError("Team cannot take the specified inducement");

      inducementCost += cost;
    }
  }
  return inducementCost + starPlayerCost;
}
