import { PrismaClient } from '@prisma/client/edge';
import { readFileSync } from 'fs';
const prisma = new PrismaClient();

const loadJSON = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url)).toString());

async function main(): Promise<void> {
  type SkillCategoryType = 'G' | 'M' | 'P' | 'S' | 'A' | 'T';
  type JSONSkillType = {
    name: string;
    rules: string;
    category: SkillCategoryType;
    purchasable: boolean;
  };
  const skills = (loadJSON('./seeds/skills.json') as JSONSkillType[]);
  // eslint-disable-next-line no-underscore-dangle
  await prisma.skill.createMany({
    data: skills.map(skill => ({
      name: skill.name,
      rules: skill.rules,
      category: skill.purchasable ? skill.category : 'T',
    })),
  });

  type JSONRosterType = {
    name: string;
    specialRules: string[];
    rerollCost: number;
    tier: number;
    players: Array<{
      position: string;
      max: number;
      cost: number;
      MA: number;
      ST: number;
      AG: number;
      PA: number | null;
      AV: number;
      skills: string[];
      primary: SkillCategoryType[];
      secondary: SkillCategoryType[];
    }>;
  };
  const rosters = loadJSON('./seeds/rosters.json') as JSONRosterType[];
  const rules = rosters.flatMap(roster => roster.specialRules);
  await prisma.specialRule.createMany({ data: rules.map(rule => ({ name: rule })), skipDuplicates: true });
  await Promise.all(rosters.map(roster => prisma.roster.create({
    data: {
      name: roster.name,
      rerollCost: roster.rerollCost,
      tier: roster.tier,
      specialRules: { connect: roster.specialRules.map(rule => ({ name: rule })) },
    },
  })));

  await Promise.all(rosters.flatMap(roster => roster.players.map(async position =>
    prisma.position.create({
      data: {
        name: position.position,
        rosterName: roster.name,
        MA: position.MA,
        AG: position.AG,
        AV: position.AV,
        ST: position.ST,
        PA: position.PA,
        primary: position.primary,
        secondary: position.secondary,
        max: position.max,
        cost: position.cost,
        skills: { connect: position.skills.map(s => ({ name: s })) },
      },
    }))));

  type JSONStarPlayerType = {
    name: string;
    MA: number;
    ST: number;
    AG: number;
    PA: number | null;
    AV: number;
    skills: Array<{ name: string }>;
    specialRule: string;
    hiringFee: number;
    playsFor: string[];
  };
  const starPlayers = loadJSON('./seeds/starPlayers.json') as JSONStarPlayerType[];
  await Promise.all(starPlayers.map(star => prisma.starPlayer.create({
    data: {
      ...star,
      playsFor: { connect: star.playsFor.map(r => ({ name: r })) },
      skills: { connect: star.skills },
    },
  })));

  type JSONInducementType = {
    max: number;
    name: string;
    price: number | null;
    specialPriceRule: string;
    specialPrice: number;
  };
  const inducements = loadJSON('./seeds/inducements.json') as JSONInducementType[];
  await prisma.inducement.createMany({
    data: inducements.map(i => ({
      ...i,
      rules: '',
      specialPriceRule: undefined,
      specialPriceRuleName: i.specialPriceRule,
    })),
  });

  type JSONWizardType = {
    name: string;
    price: number;
    rules: string;
  };
  const wizards = loadJSON('./seeds/wizards.json') as JSONWizardType[];
  await prisma.inducement.create({
    data: {
      name: 'Wizard',
      max: 1,
      rules: 'Wizards to kerzap shit',
      options: { createMany: { data: wizards } },
    },
  });
}

main()
  .then(async() => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
