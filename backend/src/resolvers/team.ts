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
  players: (parent, query) => {
    const teamPlayers = players
      .filter(p => parent.playerIds.includes(p.id))
      .filter(p => (query.missNextGame !== undefined
        ? p.injuries.missNextGame === query.missNextGame
        : true));
    return teamPlayers;
  },
  teamValue: parent => {
    const teamPlayers = players
      .filter(player => parent.playerIds.includes(player.id));
    const playerValues = teamPlayers
      .reduce((prev, player) => {
        const { base, current } = getPlayerValue(player);
        return { base: base + prev.base, current: current + prev.current };
      }, { base: 0, current: 0 });
    const roster = rosters.find(r => r.name === parent.race);
    if (!roster) throw new Error('Unable to locate team roster');
    const staffValue =
      (parent.apothecary ? 50000 : 0) +
      ((parent.cheerleaders + parent.coaches) * 10000) +
      (parent.rerolls * roster.rerollCost);
    const uninjuredPlayerCount = teamPlayers.filter(p => !p.injuries.missNextGame).length;
    if (uninjuredPlayerCount < 11) {
      // The team takes on journeymen
      const journeymanCost = roster.players.find(p => p.max >= 12)?.cost;
      if (journeymanCost === undefined) throw new Error('Unable to find journeymen for the team');
      playerValues.current += journeymanCost * (11 - uninjuredPlayerCount);
    }
    return { base: playerValues.base + staffValue, current: playerValues.current + staffValue };
  },
  specialRules: parent => {
    const roster = rosters.find(r => r.name === parent.race)?.specialRules;
    if (!roster) throw new Error('Unable to locate team roster');
    return roster;
  },
};

export { Team, Query };
