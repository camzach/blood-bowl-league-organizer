import type {
  QueryResolvers,
  StarPlayer,
  Wizard,
} from '../graphql.gen';
import type { BasicInducementModel } from '../models/inducement';
import importedInducements from '../inducements.json';
const inducements = importedInducements as unknown as BasicInducementModel[];
import starPlayers from '../starplayers.json';
import wizards from '../wizards.json';

function getStarPlayers(specialRules?: string[] | null): StarPlayer[] {
  return starPlayers.filter(player => {
    if (!specialRules) return true;
    let result = true;
    if (player.playsFor) result &&= player.playsFor.some(rule => specialRules.includes(rule));
    if (player.doesntPlayFor) result &&= !player.doesntPlayFor.some(rule => specialRules.includes(rule));
    return result;
  });
}

function getWizards(specialRules?: string[] | null): Wizard[] {
  return wizards.filter(wizard => {
    if (!specialRules) return true;
    let result = false;
    if (wizard.price) result = true;
    return result;
  });
}

type PriceProps = { price: number | null; specialPrices: Array<[string, number]> };
function getInducements<T extends PriceProps>(list: T[], specialRules?: string[] | null): T[] {
  return list
    .filter(inducement => {
      if (!specialRules) return true;
      let result = false;
      if (inducement.price !== null) result = true;
      if (inducement.specialPrices.some(([rule]) => specialRules.includes(rule))) result = true;
      return result;
    })
    .map(inducement => ({
      ...inducement,
      specialPrices: inducement.specialPrices.map(([rule, price]) => ({ rule, price })),
    }));
}

const Query: QueryResolvers = {
  inducements: (parent, query) => ({
    basic: getInducements(inducements, query.specialRules),
    biasedRefs: [],
    infamousCoachingStaff: [],
    starPlayers: getStarPlayers(query.specialRules),
    wizards: getWizards(query.specialRules),
  }),
};

export { Query };
