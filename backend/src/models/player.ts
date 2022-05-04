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
