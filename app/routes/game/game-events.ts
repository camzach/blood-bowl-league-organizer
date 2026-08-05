import z from "zod";

export const injuryType = z.enum([
  "bh",
  "mng",
  "ni",
  "ma",
  "st",
  "ag",
  "pa",
  "av",
  "dead",
]);

const baseEvent = z.object({ player: z.string() });

export const casualtyEvent = z.intersection(
  baseEvent,
  z.object({
    type: z.literal("casualty"),
    injury: z.object({
      type: injuryType,
      causedBy: z
        .object({
          player: z.string(),
          type: z.enum(["star", "player"]),
          hatredKeyword: z.string(),
        })
        .optional(),
    }),
  }),
);

export const touchdownEvent = z.intersection(
  z.object({
    type: z.literal("touchdown"),
    playerType: z.enum(["star", "player"]),
  }),
  baseEvent,
);

export const completionEvent = z.intersection(
  z.object({ type: z.literal("completion") }),
  baseEvent,
);

export const interceptionEvent = z.intersection(
  z.object({ type: z.literal("interception") }),
  baseEvent,
);

export const safeLandingEvent = z.intersection(
  z.object({ type: z.literal("safeLanding") }),
  baseEvent,
);

export const otherSPPEvent = z.intersection(
  z.object({ type: z.literal("otherSPP") }),
  baseEvent,
);

export const gameEvent = z.union([
  casualtyEvent,
  touchdownEvent,
  completionEvent,
  interceptionEvent,
  safeLandingEvent,
  otherSPPEvent,
]);
