import nanoid from "../utils/nanoid";
import {
  SkillCategory,
  inducement,
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
import rosterSeed from "./seeds/rosters.json" assert { type: "json" };
import skillSeed from "./seeds/skills.json" assert { type: "json" };
import inducementSeed from "./seeds/inducements.json" assert { type: "json" };
import starPlayerSeed from "./seeds/starPlayers.json" assert { type: "json" };
import { db } from "../utils/drizzle";
import { config } from "dotenv";

config();

const skills: (typeof skill.$inferInsert)[] = [];
const specialRules: Set<string> = new Set();
const rosters: (typeof roster.$inferInsert)[] = [];
const rosterSlots: (typeof rosterSlot.$inferInsert)[] = [];
const positions: (typeof position.$inferInsert)[] = [];
const skillsToPositions: (typeof skillToPosition.$inferInsert)[] = [];
const specialRulesToRosters: (typeof specialRuleToRoster.$inferInsert)[] = [];
const inducements: (typeof inducement.$inferInsert)[] = [];
const starPlayers: (typeof starPlayer.$inferInsert)[] = [];
const skillsToStarPlayers: (typeof skillToStarPlayer.$inferInsert)[] = [];
const specialRulesToStarPlayers: (typeof specialRuleToStarPlayer.$inferInsert)[] =
  [];

type NotArray<T extends any | Array<any>> = T extends Array<any>
  ? T[number]
  : T;

for (const s of skillSeed) {
  skills.push({
    name: s.name,
    category: s.category as SkillCategory,
    rules: s.rules,
  });
}

function createPosition(
  p: NotArray<(typeof rosterSeed)[number]["players"][number]>,
  slotId: string
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
    specialRulesToStarPlayers.push({
      specialRuleName: r,
      starPlayerName: s.name,
    });
  }
}

const skillInsert = db
  .insert(skill)
  .values(skills)
  .then(() => console.log("skills inserted"));
const specialRuleInsert = db
  .insert(specialRule)
  .values(Array.from(specialRules, (r) => ({ name: r })))
  .then(() => console.log("special rules inserted"));
const rosterInsert = db
  .insert(roster)
  .values(rosters)
  .then(() => console.log("rosters inserted"));
const rosterSlotInsert = rosterInsert
  .then(() => db.insert(rosterSlot).values(rosterSlots))
  .then(() => console.log("roster slots inserted"));
const specialRuleToRosterInsert = rosterInsert
  .then(() => db.insert(specialRuleToRoster).values(specialRulesToRosters))
  .then(() => console.log("specialRuleToRoster inserted"));
const positionInsert = rosterSlotInsert
  .then(() => db.insert(position).values(positions))
  .then(() => console.log("positions inserted"));
const skillToPositionInsert = positionInsert
  .then(() => db.insert(skillToPosition).values(skillsToPositions))
  .then(() => console.log("skillToPosition inserted"));
const inducementInsert = specialRuleInsert.then(() =>
  db.insert(inducement).values(inducements)
);
const starPlayerInsert = db
  .insert(starPlayer)
  .values(starPlayers)
  .then(() => console.log("star players inserted"));
const starPlayerSkillsInsert = Promise.all([
  starPlayerInsert,
  skillInsert,
]).then(() =>
  db
    .insert(skillToStarPlayer)
    .values(skillsToStarPlayers)
    .then(() => console.log("skillToStar inserted"))
);
const specialRuleToStarInsert = Promise.all([
  starPlayerInsert,
  specialRuleInsert,
]).then(() =>
  db
    .insert(specialRuleToStarPlayer)
    .values(specialRulesToStarPlayers)
    .then(() => console.log("specRuleToStar added"))
);

Promise.all([
  skillInsert,
  specialRuleInsert,
  rosterInsert,
  rosterSlotInsert,
  specialRuleToRosterInsert,
  positionInsert,
  skillToPositionInsert,
  inducementInsert,
  starPlayerInsert,
  starPlayerSkillsInsert,
  specialRuleToStarInsert,
]).then(() => {
  console.log("done");
  process.exit(0);
});
