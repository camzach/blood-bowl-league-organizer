export const skillConflicts: Partial<Record<string, string[]>> = {
  "No Hands": ["Catch", "Diving Catch", "Safe Pair of Hands"],
  Frenzy: ["Grab"],
  Grab: ["Frenzy"],
  Leap: ["Pogo Stick"],
  "Pogo Stick": ["Leap"],
  "Ball & Chain": [
    "Grab",
    "Leap",
    "Multiple Block",
    "On the Ball",
    "Shadowing",
  ],
};
