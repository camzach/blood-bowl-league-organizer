import type { QueryResolvers, TeamResolvers } from '../graphql.gen';
import teams from '../teams.json';
import players from '../players.json';
import rosters from '../rosters.json';
import { getPlayerValue } from './utils';

const Query: QueryResolvers = {
  team: (parent, query) => {
    const team = teams.find(t => t.name === query.name);
    if (!team) return null;
    return team;
  },
  teams: () => teams,
};

const Team: TeamResolvers = {
  players: parent => {
    const teamPlayers = players.filter(p => parent.playerIds.includes(p.id));
    return teamPlayers;
  },
  teamValue: parent => {
    const playerValues = players
      .filter(player => parent.playerIds.includes(player.id))
      .reduce((prev, player) => {
        const { base, current } = getPlayerValue(player);
        return { base: base + prev.base, current: current + prev.current };
      }, { base: 0, current: 0 });
    const roster = rosters[parent.race as keyof typeof rosters];
    const staffValue =
      (parent.apothecary ? 50000 : 0) +
      ((parent.cheerleaders + parent.coaches) * 10000) +
      (parent.rerolls * roster.rerollCost);
    return { base: playerValues.base + staffValue, current: playerValues.current + staffValue };
  },
};

export { Team, Query };
