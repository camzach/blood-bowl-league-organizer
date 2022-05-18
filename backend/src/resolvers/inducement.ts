import type { Filter } from 'mongodb';
import type {
  BasicInducementDbObject,
  BiasedRefDbObject,
  InfamousCoachingStaffDbObject,
  QueryResolvers,
  StarPlayerDbObject,
  WizardDbObject,
} from '../graphql.gen';

// Function getStarPlayers(specialRules?: string[] | null): StarPlayer[] {
//   return starPlayers.filter(player => {
//     if (!specialRules) return true;
//     let result = true;
//     if (player.playsFor) result &&= player.playsFor.some(rule => specialRules.includes(rule));
//     if (player.doesntPlayFor) result &&= !player.doesntPlayFor.some(rule => specialRules.includes(rule));
//     return result;
//   });
// }

// function getWizards(specialRules?: string[] | null): Wizard[] {
//   return wizards.filter(wizard => {
//     if (!specialRules) return true;
//     let result = false;
//     if (wizard.price) result = true;
//     return result;
//   });
// }

// type PriceProps = { price: number | null; specialPrices: Array<[string, number]> };
// function getInducements<T extends PriceProps>(list: T[], specialRules?: string[] | null): T[] {
//   return list
//     .filter(inducement => {
//       if (!specialRules) return true;
//       let result = false;
//       if (inducement.price !== null) result = true;
//       if (inducement.specialPrices.some(([rule]) => specialRules.includes(rule))) result = true;
//       return result;
//     })
//     .map(inducement => ({
//       ...inducement,
//       specialPrices: inducement.specialPrices.map(([rule, price]) => ({ rule, price })),
//     }));
// }

type OtherFilter = Filter<WizardDbObject | BasicInducementDbObject | InfamousCoachingStaffDbObject | BiasedRefDbObject>;
const Query: QueryResolvers = {
  inducements: async(parent, query, context) => {
    const starPlayersQuery: Filter<StarPlayerDbObject> = query.specialRules
      ? {
        $and: [
          {
            $or: [
              { playsFor: { $exists: false } },
              { playsFor: { $elemMatch: { $in: query.specialRules } } },
            ],
          },
          {
            $or: [
              { doesntPlayFor: { $exists: false } },
              { doesntPlayFor: { $elemMatch: { $nin: query.specialRules } } },
            ],
          },
        ],
      }
      : {};

    const otherInducementsQuery: OtherFilter = query.specialRules
      ? { $or: [{ specialPrices: { $elemMatch: { rule: { $in: query.specialRules } } } }, { price: { $ne: null } }] }
      : {};
    const starPlayers = await context.db.collection('starPlayers').find<StarPlayerDbObject>(starPlayersQuery).toArray();
    const basic = await context.db.collection('inducements')
      .find<BasicInducementDbObject>(otherInducementsQuery).toArray();
    const wizards = await context.db.collection('wizards').find<WizardDbObject>(otherInducementsQuery).toArray();
    const infamousCoachingStaff = await context.db.collection('infamousCoachingStaff')
      .find<InfamousCoachingStaffDbObject>(otherInducementsQuery).toArray();
    const biasedRefs = await context.db.collection('biasedRefs')
      .find<BiasedRefDbObject>(otherInducementsQuery).toArray();
    return {
      basic,
      starPlayers,
      wizards,
      biasedRefs,
      infamousCoachingStaff,
    };
  },
};

export { Query };
