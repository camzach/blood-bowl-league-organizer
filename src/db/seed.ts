"use server";

import nanoid from "../utils/nanoid";
import {
  SkillCategory,
  inducement,
  optionalSpecialRuleToRoster,
  position,
  roster,
  rosterSlot,
  skill,
  skillToPosition,
  skillToStarPlayer,
  specialRule,
  specialRuleToRoster,
  specialRuleToStarPlayer,
  starPlayer,
} from "./schema";
import rosterSeed from "./seeds/rosters.json" with { type: "json" };
import skillSeed from "./seeds/skills.json" with { type: "json" };
import inducementSeed from "./seeds/inducements.json" with { type: "json" };
import starPlayerSeed from "./seeds/starPlayers.json" with { type: "json" };
import readline from "node:readline/promises";
import { config } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

config();
// Must import db asynchronously so env gets set first
neonConfig.webSocketConstructor = ws;
const { db } = await import("../utils/drizzle");

console.warn(`
*****************************************************
*                     WARNING                       *
* THIS SCRIPT IS NOT SAFE TO RUN IN A PRODUCTION    *
* ENVIRONMENT. DO NOT RUN IT UNLESS YOU ARE TRYING  *
* TO START A NEW PROD ENVIRONMENT OR YOU REALLY     *
* KNOW WHAT YOU'RE DOING                            *
*****************************************************
`);
const rl = readline.createInterface(process.stdin, process.stdout);
async function prompt() {
  const response = await rl.question(
    "Type YES to continue\nType DB to see your current connection string\nType anything else to quit\n> ",
  );
  if (response === "DB") {
    console.log(process.env.DATABASE_URL);
    return prompt();
  } else if (response === "YES") {
    console.log("Sure hope you know what you're doing... :)");
    return true;
  }
  console.log("Quitting.");
  return false;
}
if (!(await prompt())) {
  process.exit();
}

const skills: (typeof skill.$inferInsert)[] = [];
const specialRules: Set<string> = new Set();
const rosters: (typeof roster.$inferInsert)[] = [];
const rosterSlots: (typeof rosterSlot.$inferInsert)[] = [];
const positions: (typeof position.$inferInsert)[] = [];
const skillsToPositions: (typeof skillToPosition.$inferInsert)[] = [];
const specialRulesToRosters: (typeof specialRuleToRoster.$inferInsert)[] = [];
const optionalSpecialRulesToRosters: (typeof optionalSpecialRuleToRoster.$inferInsert)[] =
  [];
const inducements: (typeof inducement.$inferInsert)[] = [];
const starPlayers: (typeof starPlayer.$inferInsert)[] = [];
const skillsToStarPlayers: (typeof skillToStarPlayer.$inferInsert)[] = [];
const specialRulesToStarPlayers: (typeof specialRuleToStarPlayer.$inferInsert)[] =
  [];

type NotArray<T> = T extends Array<infer R> ? R : T;

for (const s of skillSeed) {
  skills.push({
    name: s.name,
    category: s.category as SkillCategory,
    rules: s.rules,
  });
}

function createPosition(
  p: NotArray<(typeof rosterSeed)[number]["players"][number]>,
  slotId: string,
) {
  const posId = nanoid();
  positions.push({
    id: posId,
    rosterSlotId: slotId,

    name: p.position,
    cost: p.cost,
    ma: p.MA,
    st: p.ST,
    av: p.AV,
    ag: p.AG,
    pa: p.PA,
    primary: p.primary as SkillCategory[],
    secondary: p.secondary as SkillCategory[],
  });
  for (const s of p.skills) {
    skillsToPositions.push({ positionId: posId, skillName: s });
  }
}

for (const r of rosterSeed) {
  rosters.push({ name: r.name, rerollCost: r.rerollCost, tier: r.tier });
  for (const pos of r.players) {
    const slotId = nanoid();
    if (Array.isArray(pos)) {
      rosterSlots.push({ rosterName: r.name, id: slotId, max: pos[0].max });
      for (const p of pos) {
        createPosition(p, slotId);
      }
    } else {
      rosterSlots.push({ rosterName: r.name, id: slotId, max: pos.max });
      createPosition(pos, slotId);
    }
  }
  for (const rule of r.specialRules) {
    specialRules.add(rule);
    specialRulesToRosters.push({
      specialRuleName: rule,
      rosterName: r.name,
    });
  }
  if (r.specialRuleOptions) {
    for (const rule of r.specialRuleOptions) {
      specialRules.add(rule);
      optionalSpecialRulesToRosters.push({
        specialRuleName: rule,
        rosterName: r.name,
      });
    }
  }
}

for (const i of inducementSeed) {
  inducements.push(i);
}

for (const s of starPlayerSeed) {
  starPlayers.push({
    name: s.name,
    hiringFee: s.hiringFee,
    ma: s.MA,
    ag: s.AG,
    st: s.ST,
    pa: s.PA,
    av: s.AV,
    specialAbility: s.specialRule,
  });
  for (const skillName of s.skills) {
    skillsToStarPlayers.push({
      skillName,
      starPlayerName: s.name,
    });
  }
  for (const r of s.playsFor) {
    specialRules.add(r);
    specialRulesToStarPlayers.push({
      specialRuleName: r,
      starPlayerName: s.name,
    });
  }
}

const transaction = db.transaction(async (tx) => {
  const skillInsert = tx
    .insert(skill)
    .values(skills)
    .then(() => console.log("skills inserted"));
  const specialRuleInsert = tx
    .insert(specialRule)
    .values(
      Array.from(specialRules, (r) => ({
        name: r,
        visible: r !== "Apothecary Allowed" && r !== "Low Cost Halfling Chef",
      })),
    )
    .then(() => console.log("special rules inserted"));
  const rosterInsert = tx
    .insert(roster)
    .values(rosters)
    .then(() => console.log("rosters inserted"));
  const rosterSlotInsert = rosterInsert
    .then(() => tx.insert(rosterSlot).values(rosterSlots))
    .then(() => console.log("roster slots inserted"));
  const specialRuleToRosterInsert = rosterInsert
    .then(() => tx.insert(specialRuleToRoster).values(specialRulesToRosters))
    .then(() => console.log("specialRuleToRoster inserted"));
  const optionalSpecialRuleToRosterInsert = rosterInsert
    .then(() =>
      tx
        .insert(optionalSpecialRuleToRoster)
        .values(optionalSpecialRulesToRosters),
    )
    .then(() => console.log("optionalSpecialRuleToRoster inserted"));
  const positionInsert = rosterSlotInsert
    .then(() => tx.insert(position).values(positions))
    .then(() => console.log("positions inserted"));
  const skillToPositionInsert = positionInsert
    .then(() => tx.insert(skillToPosition).values(skillsToPositions))
    .then(() => console.log("skillToPosition inserted"));
  const inducementInsert = specialRuleInsert
    .then(() => tx.insert(inducement).values(inducements))
    .then(() => console.log("inducements inserted"));
  const starPlayerInsert = tx
    .insert(starPlayer)
    .values(starPlayers)
    .then(() => console.log("star players inserted"));
  const starPlayerSkillsInsert = Promise.all([
    starPlayerInsert,
    skillInsert,
  ]).then(() =>
    tx
      .insert(skillToStarPlayer)
      .values(skillsToStarPlayers)
      .then(() => console.log("skillToStar inserted")),
  );
  const specialRuleToStarInsert = Promise.all([
    starPlayerInsert,
    specialRuleInsert,
  ]).then(() =>
    tx
      .insert(specialRuleToStarPlayer)
      .values(specialRulesToStarPlayers)
      .then(() => console.log("specRuleToStar added")),
  );

  await Promise.all([
    skillInsert,
    specialRuleInsert,
    rosterInsert,
    rosterSlotInsert,
    specialRuleToRosterInsert,
    optionalSpecialRuleToRosterInsert,
    positionInsert,
    skillToPositionInsert,
    inducementInsert,
    starPlayerInsert,
    starPlayerSkillsInsert,
    specialRuleToStarInsert,
  ]);
});

try {
  await transaction;
  console.log("Done!");
  process.exit();
} catch (e) {
  console.error("Something went wrong.");
  console.error(e);
  process.exit(1);
}
