"use server";
import type { Prisma } from "@prisma/client/edge";
import { SkillCategory, TeamState } from "@prisma/client/edge";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { zact } from "zact/server";
import { prisma } from "utils/prisma";
import { authOptions } from "pages/api/auth/[...nextauth]";

import { cookies, headers } from "next/headers";
import { getServerSession as originalGetServerSession } from "next-auth";

export const getServerSession = async () => {
  const req = {
    headers: Object.fromEntries(headers() as Headers),
    cookies: Object.fromEntries(
      cookies()
        .getAll()
        .map((c) => [c.name, c.value])
    ),
  };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const res = { getHeader() {}, setCookie() {}, setHeader() {} };

  // @ts-expect-error - The type used in next-auth for the req object doesn't match, but it still works
  const session = await originalGetServerSession(req, res, authOptions);
  return session;
};

function upperFirst<T extends string>(str: T): Capitalize<T> {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}` as Capitalize<T>;
}

export const fire = zact(zfd.formData({ playerId: zfd.text() }))(
  async ({ playerId }) => {
    const session = await getServerSession();
    const player = await prisma.player.findFirstOrThrow({
      where: { id: playerId },
      select: {
        playerTeamName: true,
        playerTeam: { select: { state: true, name: true } },
        teamValue: true,
        id: true,
      },
    });
    if (player.playerTeam === null)
      throw new Error("Player is not on any team");
    if (!session) throw new Error("Not authenticated");
    if (!session.user.teams.includes(player.playerTeam.name))
      throw new Error("User does not have permission to modify this team");
    if (player.playerTeam.state === TeamState.Draft) {
      return prisma.team.update({
        where: { name: player.playerTeam.name },
        data: {
          players: { delete: { id: player.id } },
          treasury: { increment: player.teamValue },
        },
      });
    }
    if (player.playerTeam.state === TeamState.PostGame) {
      return prisma.player.update({
        where: { id: player.id },
        data: { playerTeam: { disconnect: true } },
      });
    }
    throw new Error("Team not in Draft or PostGame state");
  }
);

export const update = zact(
  zfd.formData({
    player: zfd.text(),
    number: zfd.numeric(z.number().min(1).max(16)).optional(),
    name: zfd.text(z.string().min(1)).optional(),
  })
)(async (input) => {
  const session = await getServerSession();
  if (!session) throw new Error("Not authenticated");

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: input.player },
    include: {
      playerTeam: { select: { state: true, name: true } },
      skills: true,
    },
  });

  if (player.playerTeam === null) throw new Error("Player is not on any team");

  if (!session.user.teams.includes(player.playerTeam.name))
    throw new Error("User does not have permission to modify this team");
  if (
    !([TeamState.PostGame, TeamState.Draft] as TeamState[]).includes(
      player.playerTeam.state
    )
  )
    throw new Error("Team is not modifiable");

  const mutations = [
    prisma.player.update({
      where: { id: player.id },
      data: { number: input.number, name: input.name },
    }),
  ];
  if (input.number !== undefined) {
    const otherPlayer = await prisma.player.findFirst({
      where: {
        number: input.number,
        playerTeamName: player.playerTeamName,
      },
    });
    if (otherPlayer) {
      mutations.push(
        prisma.player.update({
          where: { id: otherPlayer.id },
          data: { number: player.number },
        })
      );
    }
  }
  return prisma.$transaction(mutations);
});

export const improve = zact(
  zfd.formData(
    z.intersection(
      z.object({ player: zfd.text() }),
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("chosen"),
          subtype: z.literal("primary").or(z.literal("secondary")),
          skill: z.string(),
        }),
        z.object({
          type: z.literal("random"),
          subtype: z.literal("primary").or(z.literal("secondary")),
          category: z.enum(
            Object.values(SkillCategory) as [SkillCategory, ...SkillCategory[]]
          ),
        }),
        z.object({
          type: z.literal("characteristic"),
          preferences: z
            .array(z.enum(["MA", "AG", "ST", "PA", "AV"]))
            .nonempty(),
          skill: z.string(),
        }),
      ])
    )
  )
)(async (input) => {
  const session = await getServerSession();
  if (!session) throw new Error("Not authenticated");

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: input.player },
    include: {
      playerTeam: { select: { state: true, name: true } },
      skills: true,
    },
  });

  if (player.playerTeam === null) throw new Error("Player is not on any team");
  if (!session.user.teams.includes(player.playerTeam.name))
    throw new Error("User does not have permission to modify this team");
  if (player.playerTeam.state !== TeamState.PostGame)
    throw new Error("Team is not in PostGame state");

  const skill =
    "skill" in input
      ? await prisma.skill.findUniqueOrThrow({
          where: { name: input.skill },
        })
      : null;

  if (skill !== null) {
    const validCategories =
      "subtype" in input
        ? player[input.subtype]
        : [...player.primary, ...player.secondary];
    if (!validCategories.includes(skill.category))
      throw new Error("Skill not from a valid category");
    if (player.skills.some((s) => s.name === skill.name))
      throw new Error("Player already has this skill");
  }

  const tvCostTable = {
    randomPrimary: 10_000,
    chosenPrimary: 20_000,
    randomSecondary: 20_000,
    chosenSecondary: 40_000,
    AV: 10_000,
    MA: 20_000,
    PA: 20_000,
    AG: 40_000,
    ST: 80_000,
  };

  const playerUpdate: Prisma.PlayerUpdateInput = {
    totalImprovements: { increment: 1 },
  };
  let characteristicChoice:
    | (typeof input & { type: "characteristic" })["preferences"][number]
    | "chosenSecondary"
    | null = null;
  if (input.type === "chosen" && skill !== null) {
    playerUpdate.skills = { connect: { name: skill.name } };
    playerUpdate.teamValue = {
      increment: tvCostTable[`${input.type}${upperFirst(input.subtype)}`],
    };
  } else if (input.type === "random") {
    if (!player[input.subtype].includes(input.category))
      throw new Error("Invalid skill category");
    const skills = await prisma.skill.findMany({
      where: {
        category: input.category,
        name: { notIn: player.skills.map((s) => s.name) },
      },
    });
    const rolledSkill = skills[Math.floor(Math.random() * skills.length)];
    playerUpdate.skills = { connect: { name: rolledSkill.name } };
    playerUpdate.teamValue = {
      increment: tvCostTable[`${input.type}${upperFirst(input.subtype)}`],
    };
  } else if (input.type === "characteristic" && skill !== null) {
    const rollTable: Array<Array<"MA" | "AV" | "PA" | "AG" | "ST">> = [
      ["MA", "AV"],
      ["MA", "AV"],
      ["MA", "AV"],
      ["MA", "AV"],
      ["MA", "AV"],
      ["MA", "AV"],
      ["MA", "AV"],
      ["MA", "AV", "PA"],
      ["MA", "AV", "PA"],
      ["MA", "AV", "PA"],
      ["MA", "AV", "PA"],
      ["MA", "AV", "PA"],
      ["MA", "AV", "PA"],
      ["PA", "AG"],
      ["AG", "ST"],
      ["MA", "AV", "PA", "AG", "ST"],
    ];

    const availableOptions = rollTable[Math.floor(Math.random() * 16)];
    characteristicChoice =
      input.preferences.find((pref) => availableOptions.includes(pref)) ??
      "chosenSecondary";

    playerUpdate.teamValue = {
      increment: tvCostTable[characteristicChoice],
    };

    if (characteristicChoice !== "chosenSecondary") {
      if (
        characteristicChoice === "MA" ||
        characteristicChoice === "AV" ||
        characteristicChoice === "ST"
      )
        playerUpdate[characteristicChoice] = { increment: 1 };
      else
        playerUpdate[characteristicChoice] =
          player[characteristicChoice] === null ? 6 : { decrement: 1 };

      playerUpdate[`${characteristicChoice}Improvements`] = {
        increment: 1,
      };
    } else {
      playerUpdate.skills = { connect: { name: skill.name } };
    }
  }

  return prisma.$transaction(async (tx) => {
    const sppCostTable = {
      randomPrimary: [3, 4, 6, 8, 10, 15],
      chosenPrimary: [6, 8, 12, 16, 20, 30],
      randomSecondary: [6, 8, 12, 16, 20, 30],
      chosenSecondary: [12, 14, 18, 22, 26, 40],
      characteristic: [18, 20, 24, 28, 32, 50],
    };
    const sppCost =
      input.type === "characteristic"
        ? sppCostTable[input.type][player.totalImprovements]
        : sppCostTable[`${input.type}${upperFirst(input.subtype)}`][
            player.totalImprovements
          ];
    playerUpdate.starPlayerPoints = { decrement: sppCost };
    const updatedPlayer = await tx.player.update({
      where: { id: player.id },
      data: playerUpdate,
    });

    if (updatedPlayer.totalImprovements > 6)
      throw new Error("Player cannot be improved further");
    if (updatedPlayer.starPlayerPoints < 0)
      throw new Error("Player does not have enough SPP");

    const statMinMax = {
      MA: [1, 9],
      ST: [1, 8],
      AG: [1, 6],
      PA: [1, 6],
      AV: [3, 11],
    };
    const stats = Object.keys(statMinMax) as Array<keyof typeof statMinMax>;
    for (const stat of stats) {
      if (
        (updatedPlayer[stat] ?? 1) < statMinMax[stat][0] ||
        (updatedPlayer[stat] ?? 1) > statMinMax[stat][1] ||
        updatedPlayer[`${stat}Improvements`] > 2
      )
        throw new Error("Stat cannot be improved further");
    }
  });
});
