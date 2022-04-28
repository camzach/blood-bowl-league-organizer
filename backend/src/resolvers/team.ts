import type { QueryResolvers, TeamResolvers } from '../graphql.gen';
import teams from '../teams.json';
import players from '../players.json';

export const TeamQueries: QueryResolvers = {
  team: (parent, query) => {
    const team = teams.find(t => t.name === query.name);
    if (!team) return null;
    return team;
  },
  teams: () => teams,
};

export const Team: TeamResolvers = {
  players: parent => {
    const teamPlayers = players.filter(p => parent.playerIds.includes(p.id));
    return teamPlayers;
  },
};
