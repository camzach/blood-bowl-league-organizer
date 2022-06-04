import type { Filter } from 'mongodb';
import type {
  BasicInducementDbObject,
  BiasedRefDbObject,
  InfamousCoachingStaffDbObject,
  QueryResolvers,
  SkillDbObject,
  StarPlayerDbObject,
  StarPlayerResolvers,
  WizardDbObject,
} from '../graphql.gen';

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

const StarPlayer: StarPlayerResolvers = {
  //
  skills: async(parent, query, context) => context.db.collection('skills')
    .find<SkillDbObject>({ _id: { $in: parent.skills } })
    .toArray(),
};

export { Query, StarPlayer };
