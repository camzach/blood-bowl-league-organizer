type Team = {
  players: Array<{ teamValue: number }>;
  journeymen?: Array<{ teamValue: number }>;
  apothecary: boolean;
  assistantCoaches: number;
  cheerleaders: number;
  rerolls: number;
  roster: { rerollCost: number };
};

export default function calculateTV(team: Team): number {
  return (
    team.players.reduce((sum, player) => sum + player.teamValue, 0) +
    (team.journeymen ?? []).reduce((sum, player) => sum + player.teamValue, 0) +
    (Number(team.apothecary) * 50_000) +
    ((team.assistantCoaches + team.cheerleaders) * 10_000) +
    (team.rerolls * team.roster.rerollCost)
  );
}
