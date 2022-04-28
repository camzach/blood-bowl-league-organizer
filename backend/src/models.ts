export type PlayerModel = {
  id: string;
  injuries: {
    ST: number;
    missNextGame: boolean;
    niggles: number;
    AG: number;
    AV: number;
    MA: number;
    PA: number;
  };
  number: number;
  skills: string[];
  improvements: {
    PA: number;
    ST: number;
    AG: number;
    AV: number;
    MA: number;
  };
  name: string;
  progression: string[];
  starPlayerPoints: {
    deflections: number;
    interceptions: number;
    prayersToNuffle: number;
    touchdowns: number;
    MVPs: number;
    casualties: number;
    completions: number;
  };
  teamId: string;
  position: string;
};

export type TeamModel = {
  id: string;
  race: string;
  coach: string;
  name: string;
  playerIds: string[];
  apothecary: boolean;
  coaches: number;
  cheerleaders: number;
  fans: number;
  treasury: number;
  rerolls: number;
};

export type GameModel = {
  homeId: string;
  awayId: string;
  ffHome: number;
  ffAway: number;
  tdHome: number;
  tdAway: number;
  casHome: number;
  casAway: number;
  winningsHome: number;
  winningsAway: number;
};
