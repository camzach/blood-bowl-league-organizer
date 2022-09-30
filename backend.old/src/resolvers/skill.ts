/* eslint-disable no-underscore-dangle */
import type { QueryResolvers, SkillDbObject, SkillResolvers } from '../graphql.gen';
import { SkillCategory } from '../graphql.gen';

export const Skill: SkillResolvers = {
  // Map category to enum
  category: parent => SkillCategory[parent.category],
};

export const Query: QueryResolvers = {
  skills: async(parent, query, context) => (await context.db.collection('skills')
    .find<SkillDbObject>({ purchasable: true })
    .toArray())
    .map(skill => ({ ...skill, id: skill._id.toHexString() })),
};
