import type { QueryResolvers, SkillDbObject, SkillResolvers } from '../graphql.gen';
import { SkillCategory } from '../graphql.gen';

export const Skill: SkillResolvers = {
  // Map category to enum
  category: parent => SkillCategory[parent.category],
};

export const Query: QueryResolvers = {
  skills: async(parent, query, context) => context.db.collection('skills')
    .find<SkillDbObject>({})
    .toArray(),
};
