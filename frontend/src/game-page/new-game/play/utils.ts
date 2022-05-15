import type { TeamTablePlayerFragment } from '../../../team-table/team.fragment.gen';
import type { InducementFragment } from '../queries/inducements.query.gen';
import type { RosterPlayersFragment } from '../queries/roster.query.gen';

function journeymanToTeamPlayer(
  player: RosterPlayersFragment['players'][number],
  number: number
): TeamTablePlayerFragment {
  return {
    name: `Journeyman ${player.position}`,
    number,
    position: player.position,
    MA: player.MA,
    ST: player.ST,
    AG: player.AG,
    PA: player.PA,
    AV: player.AV,
    skills: player.skills,
    starPlayerPoints: {
      MVPs: 0,
      interceptions: 0,
      prayersToNuffle: 0,
      deflections: 0,
      casualties: 0,
      completions: 0,
      touchdowns: 0,
    },
    casualties: { missNextGame: false, niggles: 0 },
    teamValue: { base: player.cost, current: player.cost },
  };
}

function starPlayerToTeamPlayer(player: InducementFragment['starPlayers'][number]): TeamTablePlayerFragment {
  return {
    name: player.name,
    number: 0,
    position: 'Star Player',
    MA: player.MA,
    ST: player.ST,
    AG: player.AG,
    PA: player.PA,
    AV: player.AV,
    skills: player.skills,
    starPlayerPoints: {
      MVPs: 0,
      interceptions: 0,
      prayersToNuffle: 0,
      deflections: 0,
      casualties: 0,
      completions: 0,
      touchdowns: 0,
    },
    casualties: { missNextGame: false, niggles: 0 },
    teamValue: { base: player.price, current: player.price },
  };
}

export function combinePlayers({ roster, journeymen, starPlayers }: {
  roster: TeamTablePlayerFragment[];
  journeymen: RosterPlayersFragment['players'];
  starPlayers: InducementFragment['starPlayers'];
}): TeamTablePlayerFragment[] {
  return [
    ...roster,
    ...journeymen.map((j, idx) => journeymanToTeamPlayer(j, 99 - (journeymen.length - 1) + idx)),
    ...starPlayers.map(starPlayerToTeamPlayer),
  ];
}
