"use server";
import { SkillCategory, TeamState } from "@prisma/client";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { zact } from "zact/server";
import { prisma } from "utils/prisma";
import { getServerSession } from "utils/server-action-getsession";
import {
  getPlayerSkills,
  getPlayerSppAndTv,
  getPlayerStats,
} from "utils/get-computed-player-fields";

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
        position: { select: { cost: true } },
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
          treasury: { increment: player.position.cost },
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

  const fetchedPlayer = await prisma.player.findUniqueOrThrow({
    where: { id: input.player },
    include: {
      playerTeam: { select: { state: true, name: true } },
      improvements: {
        include: { skill: true }
      },
      position: {
        include: { skills: true },
      },
    },
  });
  const player = { ...fetchedPlayer, skills: getPlayerSkills(fetchedPlayer) };

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

export const learnSkill = zact(
  zfd.formData(
    z.intersection(
      z.object({ player: zfd.text() }),
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("chosen"),
          skill: z.string(),
        }),
        z.object({
          type: z.literal("random"),
          category: z.enum(
            Object.values(SkillCategory) as [SkillCategory, ...SkillCategory[]]
          ),
        }),
      ])
    )
  )
)(async (input) => {
  const session = await getServerSession();
  if (!session) throw new Error("Not authenticated");

  const fetchedPlayer = await prisma.player.findUniqueOrThrow({
    where: { id: input.player },
    include: {
      playerTeam: { select: { state: true, name: true } },
      improvements: { include: { skill: true } },
      position: {
        include: { skills: true },
      },
    },
  });
  const player = {
    ...fetchedPlayer,
    skills: getPlayerSkills(fetchedPlayer),
    totalImprovements: fetchedPlayer.improvements.length,
  };

  if (player.playerTeam === null) throw new Error("Player is not on any team");
  if (!session.user.teams.includes(player.playerTeam.name))
    throw new Error("User does not have permission to modify this team");
  if (player.playerTeam.state !== TeamState.PostGame)
    throw new Error("Team is not in PostGame state");

  return prisma.$transaction(async (tx) => {
    const chooseRandom = <T>(list: T[]) =>
      list[Math.floor(Math.random() * list.length)];
    const skill =
      "skill" in input
        ? await prisma.skill.findUniqueOrThrow({ where: { name: input.skill } })
        : chooseRandom(
            await prisma.skill.findMany({ where: { category: input.category } })
          );
    if (
      !player.position.primary.includes(skill.category) &&
      !player.position.secondary.includes(skill.category)
    )
      throw new Error("Player cannot take a skill from this category");

    const updatedPlayer = await tx.player.update({
      where: { id: input.player },
      data: {
        improvements: {
          create: {
            type: `${upperFirst(input.type)}Skill`,
            order: player.improvements.length,
            skillName: skill.name,
          },
        },
      },
      include: {
        improvements: { include: { skill: true } },
        position: { include: { Roster: { include: { specialRules: true } } } },
      },
    });
    const { starPlayerPoints } = getPlayerSppAndTv(updatedPlayer);

    if (updatedPlayer.improvements.length > 6)
      throw new Error("Player cannot be improved further");
    if (starPlayerPoints < 0)
      throw new Error("Player does not have enough SPP");
  });
});

export const increaseCharacteristic = zact(
  zfd.formData({
    player: zfd.text(),
    preferences: z.array(zfd.text(z.enum(["MA", "AV", "AG", "ST", "PA"]))),
    skill: zfd.text(),
  })
)(async (input) => {
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: input.player },
    include: { position: true, _count: { select: { improvements: true } } },
  });

  const skill = await prisma.skill.findUniqueOrThrow({
    where: { name: input.skill },
  });

  if (
    !player.position.primary.includes(skill.category) ||
    !player.position.secondary.includes(skill.category)
  )
    throw new Error("Player cannot take a skill from this category");

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
  const characteristicChoice =
    input.preferences.find((pref) => availableOptions.includes(pref)) ??
    "FallbackSkill";
  await prisma.$transaction(async (tx) => {
    const updatedPlayer = await tx.player.update({
      where: { id: input.player },
      data: {
        improvements: {
          create: {
            order: player._count.improvements,
            type: characteristicChoice,
            ...(characteristicChoice === "FallbackSkill"
              ? { skill: { connect: { name: skill.name } } }
              : {}),
          },
        },
      },
      include: {
        improvements: { include: { skill: true } },
        position: { include: { Roster: { include: { specialRules: true } } } }
      },
    });
    const { starPlayerPoints } = getPlayerSppAndTv(updatedPlayer);
    if (starPlayerPoints < 0) throw new Error("Player does not have enough SPP");
  
    if (characteristicChoice !== 'FallbackSkill'){
    const updatedStats = getPlayerStats(updatedPlayer);
    const statMinMax = {
      MA: [1, 9],
      ST: [1, 8],
      AG: [1, 6],
      PA: [1, 6],
      AV: [3, 11],
    };
    if (
      (updatedStats[characteristicChoice] ?? 1) <
        statMinMax[characteristicChoice][0] ||
      (updatedStats[characteristicChoice] ?? 1) >
        statMinMax[characteristicChoice][1] ||
      updatedPlayer.improvements.filter((i) => i.type === characteristicChoice)
        .length > 2
    )
      throw new Error("Stat cannot be improved further");}
  });
});
