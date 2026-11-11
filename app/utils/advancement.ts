export const sppCostTable = {
  random_primary: [3, 4, 6, 8, 10, 15],
  chosen_primary: [6, 8, 12, 16, 20, 30],
  chosen_secondary: [10, 12, 16, 20, 24, 34],
  characteristic: [14, 16, 20, 24, 28, 38],
};

export const characteristicsByRoll = [
  ["av"],
  ["av", "pa"],
  ["av", "ma", "pa"],
  ["av", "ma", "pa"],
  ["ma", "pa"],
  ["ag", "ma"],
  ["ag", "st"],
  ["av", "pa", "ma", "ag", "st"],
] as const;
