import { d6 } from "~/app/utils/d6";

export type Result = "won" | "lost" | "tied";

export function resultOf(myScore: number, yourScore: number): Result {
  if (myScore > yourScore) return "won";
  if (yourScore > myScore) return "lost";
  return "tied";
}

export function calculateFanUpdate(result: Result, currentFans: number) {
  const roll = d6();
  let newFans = currentFans;
  if (result === "won" && roll > currentFans) newFans += 1;
  else if (result === "lost" && roll < currentFans) newFans -= 1;
  return { roll, currentFans, newFans, change: newFans - currentFans };
}
