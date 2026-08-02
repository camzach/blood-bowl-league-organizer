import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import { Route } from "./+types/advance.action";
import { db } from "~/app/utils/drizzle";
import {
  improvement,
  pendingRandomSkill,
  pendingRandomStat,
  skillCategories,
} from "~/db/schema";
import { eq } from "drizzle-orm";
import {
  getPlayerSkills,
  getPlayerSppAndTv,
  getPlayerStats,
} from "~/app/utils/get-computed-player-fields";
import { getBlockedSkills } from "~/app/utils/get-blocked-skills";
import {
  playerWithAdvancement,
  playerForTvCalculation,
} from "~/db/query-fragments/player.fragments";

const advanceSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("learn-skill"),
    skill: z.string(),
  }),
  z.object({
    action: z.literal("roll-random-skill"),
    category: z.enum(skillCategories),
  }),
  z.object({
    action: z.literal("confirm-random-skill"),
    skill: z.string(),
  }),
  z.object({
    action: z.literal("roll-random-stat"),
  }),
  z.object({
    action: z.literal("confirm-random-stat"),
    choice: z.enum(["ma", "ag", "pa", "st", "av", "fallback_skill"]),
    fallbackSkill: z.string().optional(),
  }),
]);

export const action = createValidatedAction(
  advanceSchema,
  async (data, { params }: Route.ActionArgs) => {
    const { playerId } = params;

    // Team permission check handled by team-permission-middleware layout

    // Route to appropriate handler
    switch (data.action) {
      case "learn-skill":
        return learnSkill(playerId, data);
      case "roll-random-skill":
        return rollRandomSkill(playerId, data);
      case "confirm-random-skill":
        return confirmRandomSkill(playerId, data);
      case "roll-random-stat":
        return rollRandomStat(playerId);
      case "confirm-random-stat":
        return confirmRandomStat(playerId, data);
    }
  },
);

async function learnSkill(playerId: string, input: { skill: string }) {
  return db.transaction(async (tx) => {
    const fetchedPlayer = await tx.query.player.findFirst({
      where: { id: playerId },
      with: {
        team: { columns: { state: true, id: true } },
        improvements: { with: { skill: true } },
        position: { with: { skills: true } },
        pendingRandomSkill: true,
        pendingRandomStat: true,
      },
    });
    if (!fetchedPlayer) throw new Error("Player not found");
    const proSkill = await tx.query.skill.findFirst({
      where: { name: "Pro" },
    });
    const player = {
      ...fetchedPlayer,
      skills: getPlayerSkills(fetchedPlayer, proSkill),
    };

    if (player.team === null) throw new Error("Player is not on any team");

    if (player.team.state !== "improving")
      throw new Error("Team is not in improving state");

    if (player.pendingRandomSkill) {
      throw new Error("Player has a pending random skill to resolve");
    }
    if (player.pendingRandomStat) {
      throw new Error("Player has a pending random stat to resolve");
    }

    const skill = await tx.query.skill.findFirst({
      where: { name: input.skill },
    });
    if (!skill) throw new Error("Skill not recognized");

    const skillRelations = await tx.query.skillRelation.findMany();
    const blockedSkills = getBlockedSkills(
      player.skills.map((s) => s.name),
      skillRelations,
    );
    const blockReason = blockedSkills.get(skill.name);

    if (blockReason) {
      switch (blockReason.reason) {
        case "owned":
          throw new Error("Player already has this skill");
        case "conflict":
          throw new Error(
            `Skill "${skill.name}" conflicts with existing skill "${blockReason.conflictingSkill}"`,
          );
        case "requirement":
          throw new Error(
            `Player does not meet requirements for skill "${skill.name}"`,
          );
      }
    }

    const hasAccessViaCategory =
      player.position.primary.includes(skill.category) ||
      player.position.secondary.includes(skill.category);

    if (!hasAccessViaCategory) {
      throw new Error("Player cannot take a skill from this category");
    }

    await tx.insert(improvement).values({
      type: "chosen_skill",
      order: player.improvements.filter((i) => i.order >= 0).length,
      skillName: skill.name,
      playerId: player.id,
    });

    const updatedPlayer = await tx.query.player.findFirst({
      where: { id: playerId },
      ...playerForTvCalculation,
    });
    if (!updatedPlayer) throw new Error("Failed to select after update");

    const { starPlayerPoints } = getPlayerSppAndTv(updatedPlayer);

    if (Math.max(0, ...player.improvements.map((i) => i.order)) >= 5)
      throw new Error("Player cannot be improved further");
    if (starPlayerPoints < 0)
      throw new Error("Player does not have enough SPP");

    return { success: true };
  });
}

async function rollRandomSkill(
  playerId: string,
  input: { category: (typeof skillCategories)[number] },
) {
  return db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: { id: playerId },
      with: {
        team: { columns: { state: true, id: true } },
        improvements: { with: { skill: true } },
        position: { with: { skills: true } },
        pendingRandomSkill: true,
        pendingRandomStat: true,
      },
    });
    if (!player) throw new Error("Player not found");

    if (player.team === null) throw new Error("Player is not on any team");

    if (player.team.state !== "improving")
      throw new Error("Team is not in improving state");

    if (player.pendingRandomSkill) {
      throw new Error("Player has a pending random skill to resolve");
    }
    if (player.pendingRandomStat) {
      throw new Error("Player has a pending random stat to resolve");
    }
    if (Math.max(0, ...player.improvements.map((i) => i.order)) >= 5) {
      throw new Error("Player may not be improved further");
    }

    if (!player.position.primary.includes(input.category)) {
      throw new Error("Player cannot take a random skill from this category");
    }

    const proSkill = await tx.query.skill.findFirst({
      where: { name: "Pro" },
    });
    const playerSkills = getPlayerSkills(player, proSkill).map(
      (skill) => skill.name,
    );
    const skillRelations = await tx.query.skillRelation.findMany({});
    const skillsInCategory = new Set(
      (
        await tx.query.skill.findMany({
          where: { category: input.category },
        })
      ).map((s) => s.name),
    );
    const blockedSkills = new Set(
      getBlockedSkills(playerSkills, skillRelations).keys(),
    );
    const skillChoices = Array.from(
      skillsInCategory.difference(blockedSkills),
    );

    const randomSkill1 =
      skillChoices[Math.floor(Math.random() * skillChoices.length)];
    const randomSkill2 =
      skillChoices[Math.floor(Math.random() * skillChoices.length)];

    await tx.insert(pendingRandomSkill).values({
      category: input.category,
      playerId: player.id,
      skillName1: randomSkill1,
      skillName2: randomSkill2,
    });

    return { skillName1: randomSkill1, skillName2: randomSkill2 };
  });
}

async function confirmRandomSkill(playerId: string, input: { skill: string }) {
  return db.transaction(async (tx) => {
    const fetchedPlayer = await tx.query.player.findFirst({
      where: { id: playerId },
      with: {
        team: { columns: { state: true, id: true } },
        improvements: { with: { skill: true } },
        position: { with: { skills: true } },
        pendingRandomStat: true,
        pendingRandomSkill: {
          with: {
            skill1: true,
            skill2: true,
          },
        },
      },
    });
    if (!fetchedPlayer) throw new Error("Player not found");
    const proSkill = await tx.query.skill.findFirst({
      where: { name: "Pro" },
    });
    const player = {
      ...fetchedPlayer,
      skills: getPlayerSkills(fetchedPlayer, proSkill),
    };

    if (player.team === null) throw new Error("Player is not on any team");

    if (player.team.state !== "improving")
      throw new Error("Team is not in improving state");

    if (!player.pendingRandomSkill) {
      throw new Error(
        "Player does not have a pending random skill to confirm",
      );
    }

    if (
      ![
        player.pendingRandomSkill.skill1.name,
        player.pendingRandomSkill.skill2.name,
      ].includes(input.skill)
    ) {
      throw new Error("Skill was not one of the random choices");
    }

    const skill = await tx.query.skill.findFirst({
      where: { name: input.skill },
    });
    if (!skill) throw new Error("Skill not recognized");

    await tx.insert(improvement).values({
      type: "random_skill",
      order: player.improvements.filter((i) => i.order >= 0).length,
      skillName: skill.name,
      playerId: player.id,
    });

    await tx
      .delete(pendingRandomSkill)
      .where(eq(pendingRandomSkill.playerId, player.id));

    const updatedPlayer = await tx.query.player.findFirst({
      where: { id: playerId },
      ...playerForTvCalculation,
    });
    if (!updatedPlayer) throw new Error("Failed to select after update");

    const { starPlayerPoints: newSpp } = getPlayerSppAndTv(updatedPlayer);

    if (updatedPlayer.improvements.length > 6)
      throw new Error("Player cannot be improved further");
    if (newSpp < 0) throw new Error("Player does not have enough SPP");

    return { success: true };
  });
}

async function rollRandomStat(playerId: string) {
  return db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: { id: playerId },
      with: {
        team: { columns: { state: true, id: true } },
        improvements: true,
        pendingRandomSkill: true,
        pendingRandomStat: true,
      },
    });
    if (!player) throw new Error("Player not found");

    if (player.team === null) throw new Error("Player is not on any team");

    if (player.team.state !== "improving")
      throw new Error("Team is not in improving state");

    if (player.pendingRandomSkill) {
      throw new Error("Player has a pending random skill to resolve");
    }
    if (player.pendingRandomStat) {
      throw new Error("Player has a pending random stat to resolve");
    }
    if (Math.max(0, ...player.improvements.map((i) => i.order)) >= 5) {
      throw new Error("Player may not be improved further");
    }

    const roll = Math.floor(Math.random() * 8);

    await tx.insert(pendingRandomStat).values({
      playerId: player.id,
      roll: roll,
    });

    return { roll };
  });
}

async function confirmRandomStat(
  playerId: string,
  input:
    | { choice: "ma" | "ag" | "pa" | "st" | "av" }
    | { choice: "fallback_skill"; fallbackSkill?: string },
) {
  return db.transaction(async (tx) => {
    const fetchedPlayer = await tx.query.player.findFirst({
      where: { id: playerId },
      with: {
        team: { columns: { state: true, id: true } },
        ...playerWithAdvancement,
        improvements: { with: { skill: true } },
        position: { with: { skills: true } },
        pendingRandomSkill: true,
        pendingRandomStat: true,
      },
    });
    if (!fetchedPlayer) throw new Error("Player not found");
    const proSkill = await tx.query.skill.findFirst({
      where: { name: "Pro" },
    });
    const player = {
      ...fetchedPlayer,
      skills: getPlayerSkills(fetchedPlayer, proSkill),
    };

    if (player.team === null) throw new Error("Player is not on any team");

    if (player.team.state !== "improving")
      throw new Error("Team is not in improving state");

    if (!player.pendingRandomStat) {
      throw new Error(
        "Player does not have a pending random stat to confirm",
      );
    }

    let skillName = null;
    if (input.choice === "fallback_skill") {
      if (!input.fallbackSkill) {
        throw new Error("Fallback skill must be provided");
      }

      const skill = await tx.query.skill.findFirst({
        where: { name: input.fallbackSkill },
      });

      if (!skill) {
        throw new Error("Invalid skill chosen");
      }

      const skillRelations = await tx.query.skillRelation.findMany();
      const blockedSkills = getBlockedSkills(
        player.skills.map((s) => s.name),
        skillRelations,
      );
      const blockReason = blockedSkills.get(skill.name);

      if (blockReason) {
        switch (blockReason.reason) {
          case "owned":
            throw new Error("Player already has this skill");
          case "conflict":
            throw new Error(
              `Skill "${skill.name}" conflicts with existing skill "${blockReason.conflictingSkill}"`,
            );
          case "requirement":
            throw new Error(
              `Player does not meet requirements for skill "${skill.name}"`,
            );
        }
      }

      const hasAccessViaCategory =
        player.position.primary.includes(skill.category) ||
        player.position.secondary.includes(skill.category);

      if (!hasAccessViaCategory) {
        throw new Error("Player cannot take a skill from this category");
      }

      skillName = skill.name;
    } else {
      const characteristicsByRoll = [
        ["av"],
        ["av", "pa"],
        ["av", "ma", "pa"],
        ["ma", "pa"],
        ["ag", "ma"],
        ["ag", "st"],
        ["av", "pa", "ma", "ag", "st"],
      ];
      const characteristicChoices =
        characteristicsByRoll[player.pendingRandomStat.roll];
      if (!characteristicChoices.includes(input.choice)) {
        throw new Error("Chosen characteristic not valid");
      }
    }

    await tx.insert(improvement).values({
      type: input.choice,
      order: player.improvements.filter((i) => i.order >= 0).length,
      skillName,
      playerId: player.id,
    });

    await tx
      .delete(pendingRandomStat)
      .where(eq(pendingRandomStat.playerId, player.id));

    const updatedPlayer = await tx.query.player.findFirst({
      where: { id: playerId },
      ...playerForTvCalculation,
    });
    if (!updatedPlayer) throw new Error("Failed to select after update");

    const { starPlayerPoints: newSpp } = getPlayerSppAndTv(updatedPlayer);

    if (input.choice !== "fallback_skill") {
      const updatedStats = getPlayerStats(updatedPlayer);
      const statMinMax = {
        ma: [1, 9],
        st: [1, 8],
        ag: [1, 6],
        pa: [1, 6],
        av: [3, 11],
      };
      if (
        (updatedStats[input.choice] ?? 1) < statMinMax[input.choice][0] ||
        (updatedStats[input.choice] ?? 1) > statMinMax[input.choice][1] ||
        updatedPlayer.improvements.filter((i) => i.type === input.choice)
          .length > 2
      )
        throw new Error("Stat cannot be improved further");
    }

    if (updatedPlayer.improvements.length > 6)
      throw new Error("Player cannot be improved further");
    if (newSpp < 0) throw new Error("Player does not have enough SPP");

    return { success: true };
  });
}
