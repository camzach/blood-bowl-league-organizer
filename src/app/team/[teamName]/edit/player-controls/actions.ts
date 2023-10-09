"use server";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { zact } from "zact/server";
import {
  getPlayerSkills,
  getPlayerSppAndTv,
  getPlayerStats,
} from "utils/get-computed-player-fields";
import { db } from "utils/drizzle";
import { and, eq, sql } from "drizzle-orm";
import {
  player as dbPlayer,
  team as dbTeam,
  skill as dbSkill,
  skillCategories,
  improvement,
} from "db/schema";
import { canEditTeam } from "../actions";

export const fire = zact(zfd.formData({ playerId: zfd.text() }))(
  async ({ playerId }) => {
    return db.transaction(async (tx) => {
      const player = await tx.query.player.findFirst({
        where: eq(dbPlayer.id, playerId),
        columns: {
          membershipType: true,
          id: true,
        },
        with: {
          position: { columns: { cost: true } },
          team: { columns: { state: true, name: true } },
        },
      });
      if (!player) throw new Error("Player does not exist");
      if (player.team === null) throw new Error("Player is not on any team");
      if (player.membershipType !== "player")
        throw new Error("Player is not fireable");
      if (!(await canEditTeam(player.team.name, tx)))
        throw new Error("User does not have permission to modify this team");

      if (player.team.state === "draft") {
        return Promise.all([
          tx.delete(dbPlayer).where(eq(dbPlayer.id, playerId)),
          tx.update(dbTeam).set({
            treasury: sql`${dbTeam.treasury} - ${player.position.cost}`,
          }),
        ]);
      }
      if (player.team.state === "hiring") {
        return tx
          .update(dbPlayer)
          .set({
            membershipType: null,
          })
          .where(eq(dbPlayer.id, playerId));
      }
      throw new Error("Team not in hiring state");
    });
  }
);

export const update = zact(
  zfd.formData({
    player: zfd.text(),
    number: zfd.numeric(z.number().min(1).max(16)).optional(),
    name: zfd.text(z.string().min(1)).optional(),
  })
)(async (input) => {
  return db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: eq(dbPlayer.id, input.player),
      columns: {
        membershipType: true,
        number: true,
      },
      with: {
        team: { columns: { state: true, name: true } },
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

    if (!(await canEditTeam(player.team.name, tx)))
      throw new Error("User does not have permission to modify this team");

    if (player.team.state !== "draft" && player.team.state !== "hiring")
      throw new Error("Team is not modifiable at this time");

    const otherPlayer =
      input.number !== undefined &&
      (await tx.query.player.findFirst({
        where: and(
          eq(dbPlayer.number, input.number),
          eq(dbPlayer.teamName, player.team.name),
          eq(dbPlayer.membershipType, "player")
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
  });
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
          category: z.enum(skillCategories),
        }),
      ])
    )
  )
)(async (input) => {
  return db.transaction(async (tx) => {
    const fetchedPlayer = await db.query.player.findFirst({
      where: eq(dbPlayer.id, input.player),
      with: {
        team: { columns: { state: true, name: true } },
        improvements: { with: { skill: true } },
        position: { with: { skillToPosition: { with: { skill: true } } } },
      },
    });
    if (!fetchedPlayer) throw new Error("Player not found");
    const player = {
      ...fetchedPlayer,
      skills: getPlayerSkills(fetchedPlayer),
      totalImprovements: fetchedPlayer.improvements.length,
    };

    if (player.team === null) throw new Error("Player is not on any team");

    if (!(await canEditTeam(player.team.name, tx))) {
      throw new Error("User does not have permission to modify this team");
    }
    if (player.team.state !== "improving")
      throw new Error("Team is not in improving state");
    const chooseRandom = <T>(list: T[]) =>
      list[Math.floor(Math.random() * list.length)];
    const skill =
      "skill" in input
        ? await tx.query.skill.findFirst({
            where: eq(dbSkill.name, input.skill),
          })
        : chooseRandom(
            await tx.query.skill.findMany({
              where: eq(dbSkill.category, input.category),
            })
          );
    if (!skill) throw new Error("Skill not recognized");
    if (
      !player.position.primary.includes(skill.category) &&
      !player.position.secondary.includes(skill.category)
    )
      throw new Error("Player cannot take a skill from this category");

    await tx.insert(improvement).values({
      type: `${input.type}_skill`,
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

export const increaseCharacteristic = zact(
  zfd.formData({
    player: zfd.text(),
    preferences: z.array(zfd.text(z.enum(["ma", "av", "ag", "st", "pa"]))),
    skill: zfd.text(),
  })
)(async (input) => {
  await db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: eq(dbPlayer.id, input.player),
      with: {
        position: true,
        improvements: true,
      },
    });

    if (!player) throw new Error("Player not found");

    const skill = await tx.query.skill.findFirst({
      where: eq(dbSkill.name, input.skill),
    });
    if (!skill) throw new Error("Skill not found");

    if (
      !player.position.primary.includes(skill.category) &&
      !player.position.secondary.includes(skill.category)
    )
      throw new Error("Player cannot take a skill from this category");

    const rollTable: Array<Array<"ma" | "av" | "pa" | "ag" | "st">> = [
      ["ma", "av"],
      ["ma", "av"],
      ["ma", "av"],
      ["ma", "av"],
      ["ma", "av"],
      ["ma", "av"],
      ["ma", "av"],
      ["ma", "av", "pa"],
      ["ma", "av", "pa"],
      ["ma", "av", "pa"],
      ["ma", "av", "pa"],
      ["ma", "av", "pa"],
      ["ma", "av", "pa"],
      ["pa", "ag"],
      ["ag", "st"],
      ["ma", "av", "pa", "ag", "st"],
    ];

    const availableOptions = rollTable[Math.floor(Math.random() * 16)];
    const characteristicChoice =
      input.preferences.find((pref) => availableOptions.includes(pref)) ??
      "fallback_skill";

    await tx.insert(improvement).values({
      playerId: player.id,
      order: player.improvements.length,
      type: characteristicChoice,
      skillName:
        characteristicChoice === "fallback_skill" ? skill.name : undefined,
    });

    const updatedPlayer = await tx.query.player.findFirst({
      where: eq(dbPlayer.id, player.id),
      with: {
        improvements: {
          with: { skill: true },
        },
        position: {
          with: {
            rosterSlot: {
              with: {
                roster: {
                  with: { specialRuleToRoster: true },
                },
              },
            },
          },
        },
      },
    });
    if (!updatedPlayer) throw new Error("Failed to select after updating");

    const { starPlayerPoints } = getPlayerSppAndTv(updatedPlayer);
    if (starPlayerPoints < 0)
      throw new Error("Player does not have enough SPP");

    if (characteristicChoice !== "fallback_skill") {
      const updatedStats = getPlayerStats(updatedPlayer);
      const statMinMax = {
        ma: [1, 9],
        st: [1, 8],
        ag: [1, 6],
        pa: [1, 6],
        av: [3, 11],
      };
      if (
        (updatedStats[characteristicChoice] ?? 1) <
          statMinMax[characteristicChoice][0] ||
        (updatedStats[characteristicChoice] ?? 1) >
          statMinMax[characteristicChoice][1] ||
        updatedPlayer.improvements.filter(
          (i) => i.type === characteristicChoice
        ).length > 2
      )
        throw new Error("Stat cannot be improved further");
    }
  });
});
