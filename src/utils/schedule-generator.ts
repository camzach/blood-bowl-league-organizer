type PairingsType = [string, string][];

export function generateSchedule(teams: string[]): PairingsType {
  const localTeams: Array<string | null> = [...teams];
  const pairings: [string, string][] = [];
  const homeAwayCounts = Object.fromEntries(
    localTeams.map((team) => [team, [0, 0]])
  ) as Record<string, [number, number]>;
  if (localTeams.length % 2 === 1) localTeams.push(null);

  const teamCount = localTeams.length;
  const rounds = teamCount - 1;
  const half = teamCount / 2;

  const teamIndices = localTeams.map((_, i) => i).slice(1);

  for (let round = 0; round < rounds; round++) {
    const newTeamIndices = [0].concat(teamIndices);

    const firstHalf = newTeamIndices.slice(0, half);
    const secondHalf = newTeamIndices.slice(half, teamCount).reverse();

    for (let i = 0; i < firstHalf.length; i++) {
      let home = localTeams[firstHalf[i]];
      let away = localTeams[secondHalf[i]];
      if (home === null || away === null) continue;
      if (round % 2 === 0) {
        const tmp = home;
        home = away;
        away = tmp;
      }
      homeAwayCounts[home][0] += 1;
      homeAwayCounts[away][1] += 1;
      pairings.push([home, away]);
    }

    // Rotating the array
    teamIndices.push(teamIndices.shift() as number);
  }

  const isScheduleBalanced = (): boolean =>
    Object.values(homeAwayCounts).every(
      ([home, away]) =>
        Math.abs(home - away) === (localTeams.includes(null) ? 0 : 1)
    );

  const switchHomeAway = (game: (typeof pairings)[number]): void => {
    const [home, away] = game;
    game.reverse();
    homeAwayCounts[home][0] -= 1;
    homeAwayCounts[home][1] += 1;
    homeAwayCounts[away][0] += 1;
    homeAwayCounts[away][1] -= 1;
  };

  function rebalance(): void {
    if (localTeams.includes(null)) {
      const [tooManyHome] =
        Object.entries(homeAwayCounts).find(
          ([_, [home, away]]) => home - away > 0
        ) ?? ([] as never[]);
      const [tooManyAway] =
        Object.entries(homeAwayCounts).find(
          ([_, [home, away]]) => away - home > 0
        ) ?? ([] as never[]);
      const gameToFix = pairings.find(
        ([home, away]) => home === tooManyHome && away === tooManyAway
      );
      if (gameToFix) {
        switchHomeAway(gameToFix);
        return;
      }
      let gameA = null;
      let gameB = null;
      for (const intermediary of localTeams) {
        gameA = pairings.find(
          ([home, away]) => home === tooManyHome && away === intermediary
        );
        gameB = pairings.find(
          ([home, away]) => away === tooManyAway && home === intermediary
        );
        if (!gameA || !gameB) {
          gameA = null;
          gameB = null;
        } else {
          break;
        }
      }
      // gameA and gameB will always be found
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      switchHomeAway(gameA!);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      switchHomeAway(gameB!);
    } else {
      // This will always find a pairing
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const [tooManyHome] = Object.entries(homeAwayCounts).find(
        ([_, [home, away]]) => home - away > 1
      )!;
      if (tooManyHome !== null) {
        const game =
          // This will always find a pairing
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          pairings.find(
            ([home, away]) =>
              home === tooManyHome &&
              homeAwayCounts[away][1] > homeAwayCounts[away][0]
          )!;
        switchHomeAway(game);
        return;
      }
      const [tooManyAway] =
        // This will always find a pairing
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Object.entries(homeAwayCounts).find(
          ([_, [home, away]]) => away - home > 1
        )!;
      const game =
        // This will always find a pairing
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pairings.find(
          ([home, away]) =>
            home === tooManyAway &&
            homeAwayCounts[away][1] > homeAwayCounts[away][0]
        )!;
      switchHomeAway(game);
    }
  }

  while (!isScheduleBalanced()) rebalance();

  return pairings;
}

// export const scheduleRouter = router({
//   generate: publicProcedure.mutation(async ({ ctx }) => {
//     const games = await ctx.prisma.game.count();
//     if (games > 0) throw new Error("Schedule already generated");
//     const teams = (
//       await ctx.prisma.team.findMany({ select: { name: true } })
//     ).map((t) => t.name);
//     const pairings = generateSchedule(teams);
//     return ctx.prisma.game.createMany({ data: pairings });
//   }),
// });
