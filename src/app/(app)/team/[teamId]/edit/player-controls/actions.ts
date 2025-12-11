"use server";
import { z } from "zod";
import { action, playerPermissionMiddleware } from "~/utils/safe-action";
import {
  getPlayerSkills,
  getPlayerSppAndTv,
  getPlayerStats,
} from "~/utils/get-computed-player-fields";
import { db } from "~/utils/drizzle";
import { and, eq, sql } from "drizzle-orm";
import {
  player as dbPlayer,
  team as dbTeam,
  skill as dbSkill,
  skillCategories,
  improvement,
  pendingRandomSkill,
  pendingRandomStat,
} from "~/db/schema";

import { getBlockedSkills } from "~/utils/get-blocked-skills";

export const makeCaptain = action
  .inputSchema(z.object({ playerId: z.string() }))
  .use(async ({ next, clientInput }) => {
    const { playerId } = z.object({ playerId: z.string() }).parse(clientInput);
    return next({ ctx: { authParams: { playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: { playerId } }) => {
    return db.transaction(async (tx) => {
      const player = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, playerId),
        columns: {
          teamId: true,
          isCaptain: true,
        },
        with: {
          team: {
            with: { roster: { with: { specialRuleToRoster: true } } },
          },
          position: {
            with: {
              keywordToPosition: {
                with: { keyword: true },
              },
            },
          },
        },
      });

      if (!player) throw new Error("Player not found");
      if (!player.teamId) throw new Error("Player not on a team");
      if (!player.team) throw new Error("Team not found");
      if (!player.position)
        throw new Error("Could not identify player position");

      if (
        !player.team.roster.specialRuleToRoster.some(
          (r) => r.specialRuleName === "Team Captain",
        )
      ) {
        throw new Error("This team's roster does not allow a captain.");
      }

      if (
        player.position.keywordToPosition.some(
          (k) => k.keyword.name === "Big Guy",
        )
      ) {
        throw new Error("A Big Guy cannot be a captain.");
      }

      if (player.team.state === "draft") {
        await tx
          .update(dbPlayer)
          .set({ isCaptain: false })
          .where(eq(dbPlayer.teamId, player.teamId));
      } else if (
        await tx.query.player.findFirst({
          where: and(
            eq(dbPlayer.teamId, player.teamId),
            eq(dbPlayer.isCaptain, true),
          ),
        })
      ) {
        throw new Error("Team already has a captain");
      }

      await tx
        .update(dbPlayer)
        .set({ isCaptain: true })
        .where(eq(dbPlayer.id, playerId));
    });
  });

export const fire = action
  .inputSchema(z.object({ playerId: z.string() }))
  .use(async ({ next, clientInput }) => {
    const { playerId } = z.object({ playerId: z.string() }).parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: { playerId } }) => {
    return db.transaction(async (tx) => {
      const player = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, playerId),
        columns: {
          membershipType: true,
          id: true,
          teamId: true,
          isCaptain: true,
          agInjuries: true,
          stInjuries: true,
          avInjuries: true,
          maInjuries: true,
        },
        with: {
          position: { columns: { cost: true } },
          team: { columns: { state: true, id: true, treasury: true } },
        },
      });
      if (!player) throw new Error("Player does not exist");
      if (player.team === null) throw new Error("Player is not on any team");
      if (player.membershipType !== "player")
        throw new Error("Player is not fireable");

      if (player.isCaptain) {
        const hasInjury =
          player.agInjuries > 0 ||
          player.stInjuries > 0 ||
          player.avInjuries > 0 ||
          player.maInjuries > 0;
        if (!hasInjury) {
          throw new Error(
            "A captain can only be fired if they have a stat-reducing injury.",
          );
        }
      }

      if (player.team.state === "draft") {
        await Promise.all([
          tx.delete(dbPlayer).where(eq(dbPlayer.id, playerId)),
          tx
            .update(dbTeam)
            .set({
              treasury: sql`${dbTeam.treasury} + ${player.position.cost}`,
            })
            .where(eq(dbTeam.id, player.team.id)),
        ]);
      } else if (player.team.state === "hiring") {
        await tx
          .update(dbPlayer)
          .set({
            teamId: null,
            membershipType: null,
          })
          .where(eq(dbPlayer.id, playerId));
      } else {
        throw new Error("Team not in hiring state");
      }

      return true;
    });
  });

export const update = action
  .inputSchema(
    z.object({
      player: z.string(),
      number: z.number().min(1).max(16).optional(),
      name: z.string().min(1).optional(),
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { player: playerId } = z
      .object({ player: z.string() })
      .parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const player = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, input.player),
        columns: {
          membershipType: true,
          number: true,
          name: true, // Include name to log old value
        },
        with: {
          team: { columns: { state: true, id: true } },
          improvements: {
            with: { skill: true },
          },
          position: {
            with: { skillToPosition: { with: { skill: true } } },
          },
        },
      });
      if (!player) throw new Error("Player does not exist");

      if (player.team === null || player.membershipType !== "player")
        throw new Error("Player is not on any team");

      if (!["hiring", "improving", "draft"].includes(player.team.state))
        throw new Error("Team is not modifiable at this time");

      const otherPlayer =
        input.number !== undefined &&
        (await tx.query.player.findFirst({
          where: and(
            eq(dbPlayer.number, input.number),
            eq(dbPlayer.teamId, player.team.id),
            eq(dbPlayer.membershipType, "player"),
          ),
          columns: { id: true },
        }));

      const mutations = [
        tx
          .update(dbPlayer)
          .set({
            number: input.number,
            name: input.name,
          })
          .where(eq(dbPlayer.id, input.player)),
        otherPlayer &&
          tx
            .update(dbPlayer)
            .set({
              number: player.number,
            })
            .where(eq(dbPlayer.id, otherPlayer.id)),
      ];

      await Promise.all(mutations);

      const auditLogOldValue: { number?: number | null; name?: string | null } =
        {};
      const auditLogNewValue: { number?: number | null; name?: string | null } =
        {};

      if (input.number !== undefined && input.number !== player.number) {
        auditLogOldValue.number = player.number;
        auditLogNewValue.number = input.number;
      }
      if (input.name !== undefined && input.name !== player.name) {
        auditLogOldValue.name = player.name;
        auditLogNewValue.name = input.name;
      }
    });
  });

export const learnSkill = action
  .inputSchema(z.object({ player: z.string(), skill: z.string() }))
  .use(async ({ next, clientInput }) => {
    const { player: playerId } = z
      .object({ player: z.string() })
      .parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const fetchedPlayer = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, input.player),
        with: {
          team: { columns: { state: true, id: true } },
          improvements: { with: { skill: true } },
          position: { with: { skillToPosition: { with: { skill: true } } } },
          pendingRandomSkill: true,
          pendingRandomStat: true,
        },
      });
      if (!fetchedPlayer) throw new Error("Player not found");
      const proSkill = await tx.query.skill.findFirst({
        where: eq(dbSkill.name, "Pro"),
      });
      const player = {
        ...fetchedPlayer,
        skills: getPlayerSkills(fetchedPlayer, proSkill),
        totalImprovements: fetchedPlayer.improvements.length,
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
        where: eq(dbSkill.name, input.skill),
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
        order: player.improvements.length,
        skillName: skill.name,
        playerId: player.id,
      });

      const updatedPlayer = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, player.id),
        with: {
          improvements: { with: { skill: true } },
          position: {
            with: {
              rosterSlot: {
                with: { roster: { with: { specialRuleToRoster: true } } },
              },
            },
          },
        },
      });
      if (!updatedPlayer) throw new Error("Failed to select after update");

      const { starPlayerPoints } = getPlayerSppAndTv(updatedPlayer);

      if (updatedPlayer.improvements.length > 6)
        throw new Error("Player cannot be improved further");
      if (starPlayerPoints < 0)
        throw new Error("Player does not have enough SPP");
    });
  });

export const rollRandomSkill = action
  .inputSchema(
    z.object({ player: z.string(), category: z.enum(skillCategories) }),
  )
  .use(async ({ next, clientInput }) => {
    const { player: playerId } = z
      .object({ player: z.string() })
      .parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const player = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, input.player),
        with: {
          team: { columns: { state: true, id: true } },
          improvements: { with: { skill: true } },
          position: { with: { skillToPosition: { with: { skill: true } } } },
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
      if (player.improvements.length >= 6) {
        throw new Error("Player may not be improved further");
      }

      if (!player.position.primary.includes(input.category)) {
        throw new Error("Player cannot take a random skill from this category");
      }

      const proSkill = await tx.query.skill.findFirst({
        where: eq(dbSkill.name, "Pro"),
      });
      const playerSkills = getPlayerSkills(player, proSkill).map(
        (skill) => skill.name,
      );
      const skillRelations = await tx.query.skillRelation.findMany({});
      const skillsInCategory = new Set(
        (
          await tx.query.skill.findMany({
            where: eq(dbSkill.category, input.category),
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
  });

export const confirmRandomSkill = action
  .inputSchema(z.object({ player: z.string(), skill: z.string() }))
  .use(async ({ next, clientInput }) => {
    const { player: playerId } = z
      .object({ player: z.string() })
      .parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const fetchedPlayer = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, input.player),
        with: {
          team: { columns: { state: true, id: true } },
          improvements: { with: { skill: true } },
          position: { with: { skillToPosition: { with: { skill: true } } } },
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
        where: eq(dbSkill.name, "Pro"),
      });
      const player = {
        ...fetchedPlayer,
        skills: getPlayerSkills(fetchedPlayer, proSkill),
        totalImprovements: fetchedPlayer.improvements.length,
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
        where: eq(dbSkill.name, input.skill),
      });
      if (!skill) throw new Error("Skill not recognized");

      await tx.insert(improvement).values({
        type: "random_skill",
        order: player.improvements.length,
        skillName: skill.name,
        playerId: player.id,
      });

      await tx
        .delete(pendingRandomSkill)
        .where(eq(pendingRandomSkill.playerId, player.id));

      const updatedPlayer = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, player.id),
        with: {
          improvements: { with: { skill: true } },
          position: {
            with: {
              rosterSlot: {
                with: { roster: { with: { specialRuleToRoster: true } } },
              },
            },
          },
        },
      });
      if (!updatedPlayer) throw new Error("Failed to select after update");

      const { starPlayerPoints: newSpp } = getPlayerSppAndTv(updatedPlayer);

      if (updatedPlayer.improvements.length > 6)
        throw new Error("Player cannot be improved further");
      if (newSpp < 0) throw new Error("Player does not have enough SPP");
    });
  });

export const rollRandomStat = action
  .inputSchema(z.object({ player: z.string() }))
  .use(async ({ next, clientInput }) => {
    const { player: playerId } = z
      .object({ player: z.string() })
      .parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const player = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, input.player),
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
      if (player.improvements.length >= 6) {
        throw new Error("Player may not be improved further");
      }

      const roll = Math.floor(Math.random() * 8);

      await tx.insert(pendingRandomStat).values({
        playerId: player.id,
        roll: roll,
      });

      return { roll };
    });
  });

export const confirmRandomStat = action
  .inputSchema(
    z
      .object({
        player: z.string(),
        choice: z.enum(["ma", "ag", "pa", "st", "av"]),
      })
      .or(
        z.object({
          player: z.string(),
          choice: z.literal("fallback_skill"),
          fallbackSkill: z.string(),
        }),
      ),
  )
  .use(async ({ next, clientInput }) => {
    const { player: playerId } = z
      .object({ player: z.string() })
      .parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const fetchedPlayer = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, input.player),
        with: {
          team: { columns: { state: true, id: true } },
          improvements: { with: { skill: true } },
          position: { with: { skillToPosition: { with: { skill: true } } } },
          pendingRandomStat: true,
        },
      });
      if (!fetchedPlayer) throw new Error("Player not found");
      const proSkill = await tx.query.skill.findFirst({
        where: eq(dbSkill.name, "Pro"),
      });
      const player = {
        ...fetchedPlayer,
        skills: getPlayerSkills(fetchedPlayer, proSkill),
        totalImprovements: fetchedPlayer.improvements.length,
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
        const skill = await db.query.skill.findFirst({
          where: eq(dbSkill.name, input.fallbackSkill),
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
          console.log(
            player.pendingRandomStat.roll,
            characteristicChoices,
            input.choice,
          );
          throw new Error("Chosen characteristic not valid");
        }
      }

      await tx.insert(improvement).values({
        type: input.choice,
        order: player.improvements.length,
        skillName,
        playerId: player.id,
      });

      await tx
        .delete(pendingRandomStat)
        .where(eq(pendingRandomStat.playerId, player.id));

      const updatedPlayer = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, player.id),
        with: {
          improvements: { with: { skill: true } },
          position: {
            with: {
              rosterSlot: {
                with: { roster: { with: { specialRuleToRoster: true } } },
              },
            },
          },
        },
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
    });
  });
