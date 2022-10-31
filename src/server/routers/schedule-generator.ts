import { publicProcedure, router } from '../trpc';

type PairingsType = Array<{
  homeTeamName: string;
  awayTeamName: string;
  round: number;
}>;

function generateSchedule(teams: string[]): PairingsType {
  const localTeams: Array<string | null> = [...teams];
  const pairings: PairingsType = [];
  const homeAwayCounts = Object.fromEntries(localTeams.map(team => [team, [0, 0]])) as Record<string, [number, number]>;
  if (localTeams.length % 2 === 1)
    localTeams.push(null);

  const teamCount = localTeams.length;
  const rounds = teamCount - 1;
  const half = teamCount / 2;


  const teamIndices = localTeams.map((_, i) => i).slice(1);

  for (let round = 0; round < rounds; round++) {
    const newTeamIndices = [0].concat(teamIndices);

    const firstHalf = newTeamIndices.slice(0, half);
    const secondHalf = newTeamIndices.slice(half, teamCount).reverse();

    for (let i = 0; i < firstHalf.length; i++) {
      const pairing = [localTeams[firstHalf[i]], localTeams[secondHalf[i]]];
      if (pairing[0] === null || pairing[1] === null)
        continue;
      if (round % 2 === 0)
        pairing.reverse();
      homeAwayCounts[pairing[0]][0] += 1;
      homeAwayCounts[pairing[1]][1] += 1;
      pairings.push({
        homeTeamName: pairing[0],
        awayTeamName: pairing[1],
        round,
      });
    }

    // Rotating the array
    teamIndices.push(teamIndices.shift() as number);
  }

  const isScheduleBalanced = (): boolean =>
    Object.values(homeAwayCounts)
      .every(([home, away]) => Math.abs(home - away) === (localTeams.includes(null) ? 0 : 1));

  const switchHomeAway = (game: (typeof pairings)[number]): void => {
    const { homeTeamName, awayTeamName } = game;
    game.homeTeamName = awayTeamName;
    game.awayTeamName = homeTeamName;
    homeAwayCounts[homeTeamName][0] -= 1;
    homeAwayCounts[homeTeamName][1] += 1;
    homeAwayCounts[awayTeamName][0] += 1;
    homeAwayCounts[awayTeamName][1] -= 1;
  };

  function rebalance(): void {
    if (localTeams.includes(null)) {
      const [tooManyHome] = Object.entries(homeAwayCounts)
        .find(([_, [home, away]]) => home - away > 0) ?? [] as never[];
      const [tooManyAway] = Object.entries(homeAwayCounts)
        .find(([_, [home, away]]) => away - home > 0) ?? [] as never[];
      const gameToFix = pairings.find(g => g.homeTeamName === tooManyHome && g.awayTeamName === tooManyAway);
      if (gameToFix) {
        switchHomeAway(gameToFix);
        return;
      }
      let gameA = null;
      let gameB = null;
      for (const intermediary of localTeams) {
        gameA = pairings.find(p => p.homeTeamName === tooManyHome && p.awayTeamName === intermediary);
        gameB = pairings.find(p => p.awayTeamName === tooManyAway && p.homeTeamName === intermediary);
        if (!gameA || !gameB) {
          gameA = null;
          gameB = null;
        } else {
          break;
        }
      }
      if (!gameA || !gameB)
        throw new Error('Schedule generator failed');
      switchHomeAway(gameA);
      switchHomeAway(gameB);
    } else {
      const [tooManyHome] = Object.entries(homeAwayCounts)
        .find(([_, [home, away]]) => home - away > 1) ?? [null];
      if (tooManyHome !== null) {
        const game = pairings.find(g =>
          g.homeTeamName === tooManyHome &&
            homeAwayCounts[g.awayTeamName][1] > homeAwayCounts[g.awayTeamName][0]) ?? null as never;
        switchHomeAway(game);
        return;
      }
      const [tooManyAway] = Object.entries(homeAwayCounts)
        .find(([_, [home, away]]) => away - home > 1) ?? [] as never[];
      const game = pairings.find(g =>
        g.homeTeamName === tooManyAway &&
            homeAwayCounts[g.awayTeamName][1] > homeAwayCounts[g.awayTeamName][0]) ?? null as never;
      switchHomeAway(game);
    }
  }

  while (!isScheduleBalanced())
    rebalance();

  return pairings;
}

export const scheduleRouter = router({
  generate: publicProcedure
    .mutation(async({ ctx }) => {
      const games = await ctx.prisma.game.count();
      if (games > 0)
        throw new Error('Schedule already generated');
      const teams = (await ctx.prisma.team.findMany({ select: { name: true } })).map(t => t.name);
      const pairings = generateSchedule(teams);
      return ctx.prisma.game.createMany({ data: pairings });
    }),
});
