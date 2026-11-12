import { d6 } from "~/app/utils/d6";

export const expensiveMistakesTable = [
  [
    "Minor Incident",
    "Crisis Averted",
    "Crisis Averted",
    "Crisis Averted",
    "Crisis Averted",
    "Crisis Averted",
  ],
  [
    "Minor Incident",
    "Minor Incident",
    "Crisis Averted",
    "Crisis Averted",
    "Crisis Averted",
    "Crisis Averted",
  ],
  [
    "Major Incident",
    "Minor Incident",
    "Minor Incident",
    "Crisis Averted",
    "Crisis Averted",
    "Crisis Averted",
  ],
  [
    "Major Incident",
    "Major Incident",
    "Minor Incident",
    "Minor Incident",
    "Crisis Averted",
    "Crisis Averted",
  ],
  [
    "Catastrophe",
    "Major Incident",
    "Major Incident",
    "Minor Incident",
    "Minor Incident",
    "Crisis Averted",
  ],
  [
    "Catastrophe",
    "Catastrophe",
    "Major Incident",
    "Major Incident",
    "Minor Incident",
    "Minor Incident",
  ],
] as const;

export type ExpensiveMistake = (typeof expensiveMistakesTable)[number][number];

// 0 below 100,000, then 1 for each 100,000 up to 6 for 600,000 and above
export function expensiveMistakesTier(treasury: number) {
  return Math.min(Math.floor(treasury / 100_000), 6);
}

export function getExpensiveMistake(
  treasury: number,
  roll: number,
): ExpensiveMistake {
  const tier = expensiveMistakesTier(treasury);
  if (tier === 0) return "Crisis Averted";
  return expensiveMistakesTable[tier - 1][roll - 1];
}

export function getExpensiveMistakeCost(
  mistake: ExpensiveMistake,
  treasury: number,
) {
  switch (mistake) {
    case "Crisis Averted":
      return 0;
    case "Minor Incident":
      return Math.ceil(d6() / 2) * 10_000;
    case "Major Incident":
      return Math.floor(treasury / 10_000) * 5_000;
    case "Catastrophe":
      return treasury - (d6() + d6()) * 10_000;
  }
}
