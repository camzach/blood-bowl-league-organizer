import type {
  InducementResolvers,
  Inducement as InducementType,
  QueryResolvers,
  StarPlayer,
  StarPlayerOptions,
} from '../graphql.gen';
import inducements from '../inducements.json';
import starPlayers from '../starplayers.json';

function getStarPlayers(specialRules?: string[] | null): StarPlayer[] {
  return starPlayers.filter(player => {
    if (!specialRules) return true;
    let result = true;
    if (player.playsFor) result &&= player.playsFor.some(rule => specialRules.includes(rule));
    if (player.doesntPlayFor) result &&= !player.doesntPlayFor.some(rule => specialRules.includes(rule));
    return result;
  });
}

const Query: QueryResolvers = {
  inducements: (parent, query) => inducements.map(inducement => ({
    ...inducement,
    specialPrices: inducement.specialPrices as Array<[string, number]> | undefined,
    choices: ((): InducementType['choices'] => {
      const { specialRules } = query;
      switch (inducement.name) {
        case 'Star Player':
          // For some reason TS is having some trouble here
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          return {
            __typename: 'StarPlayerOptions',
            starPlayers: getStarPlayers(specialRules),
          } as StarPlayerOptions;
        case '(in)Famous Coaching Staff':
          return { __typename: 'InfamousCoachingStaffOptions', infamousCoachingStaff: [] };
        case 'Wizard':
          return { __typename: 'WizardOptions', wizards: [] };
        case 'Biased Referee':
          return { __typename: 'BiasedRefOptions', biasedRefs: [] };
        default: return null;
      }
    })(),
  })).filter(inducement => {
    // Return all when no specialRules are passed
    if (!query.specialRules) return true;
    return (
      inducement.price !== undefined ||
      inducement.specialPrices?.some(([specialRule]) => query.specialRules?.includes(specialRule)) ||
      inducement.choices
    );
  }),
};

const Inducement: InducementResolvers = {};

export { Query, Inducement };
