import { readFileSync, writeFileSync } from 'fs';

const loadJSON = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url)).toString());

type SkillCategoryType = 'G' | 'M' | 'P' | 'S' | 'A' | 'T';
type JSONSkillType = {
  name: string;
  rules: string;
  category: SkillCategoryType;
  purchasable: boolean;
  _id: { $oid: string };
};
const skills = (loadJSON('./seeds/skills.json') as JSONSkillType[]);
// eslint-disable-next-line no-underscore-dangle
const getSkillById = (id: string): JSONSkillType | undefined => skills.find(s => s._id.$oid === id);

type JSONStarPlayerType = {
  name: string;
  MA: number;
  ST: number;
  AG: number;
  PA: number | null;
  AV: number;
  skills: Array<{ $oid: string }>;
  specialRule: string;
  hiringFee: number;
  playsFor?: string[];
  doesntPlayFor?: string[];
};
const starPlayers = loadJSON('./seeds/starPlayers.json') as JSONStarPlayerType[];
const newStarPlayers = starPlayers.map(star => ({
  ...star,
  skills: star.skills
    .map(({ $oid }) => getSkillById($oid)?.name)
    .filter((name): name is string => name !== undefined)
    .map(name => ({ name })),
}));

writeFileSync('/Users/cameronzach/Desktop/blood-bowl-league-organizer/backend/prisma/seeds/starPlayersNew.json', JSON.stringify(newStarPlayers), {flag: 'w+'})
