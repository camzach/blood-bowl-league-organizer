export function generateSchedule(teams: string[]) {
  if (teams.length < 2) {
    return [];
  }
  const localTeams: Array<string | null> = [...teams];
  const rounds: [string, string][][] = [];
  const homeAwayCounts = Object.fromEntries(
    localTeams.map((team) => [team, [0, 0]]),
  ) as Record<string, [number, number]>;
  if (localTeams.length % 2 === 1) localTeams.push(null);

  const teamCount = localTeams.length;
  const numRounds = teamCount - 1;
  const half = teamCount / 2;

  const teamIndices = localTeams.map((_, i) => i).slice(1);

  for (let round = 0; round < numRounds; round++) {
    const thisRound: [string, string][] = [];
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
      thisRound.push([home, away]);
    }

    rounds.push(thisRound);
    // Rotating the array
    teamIndices.push(teamIndices.shift() as number);
  }

  const pairings = rounds.flat();

  const isScheduleBalanced = (): boolean =>
    Object.values(homeAwayCounts).every(
      ([home, away]) =>
        Math.abs(home - away) === (localTeams.includes(null) ? 0 : 1),
    );

  const switchHomeAway = (game: [string, string]): void => {
    const [home, away] = game;
    game.reverse();
    homeAwayCounts[home][0] -= 1;
    homeAwayCounts[home][1] += 1;
    homeAwayCounts[away][0] += 1;
    homeAwayCounts[away][1] -= 1;
  };

  function rebalance(): void {
    /*
      Derived from:
      Sigrid Knust, Michael von Thaden,
      Balanced home–away assignments,
      Discrete Optimization,
      Volume 3, Issue 4,
      2006,
      Pages 354-365,
      ISSN 1572-5286,
      https://doi.org/10.1016/j.disopt.2006.07.002.
    */
    if (localTeams.includes(null)) {
      const [tooManyHome] = Object.entries(homeAwayCounts).find(
        ([_, [home, away]]) => home - away > 0,
      )!;
      const [tooManyAway] = Object.entries(homeAwayCounts).find(
        ([_, [home, away]]) => away - home > 0,
      )!;
      const gameToFix = pairings.find(
        ([home, away]) => home === tooManyHome && away === tooManyAway,
      );
      if (gameToFix) {
        switchHomeAway(gameToFix);
        return;
      }
      let gameA: [string, string] | undefined = undefined;
      let gameB: [string, string] | undefined = undefined;
      for (const intermediary of localTeams) {
        gameA = pairings.find(
          ([home, away]) => home === tooManyHome && away === intermediary,
        );
        gameB = pairings.find(
          ([home, away]) => away === tooManyAway && home === intermediary,
        );
        if (!gameA || !gameB) {
          gameA = undefined;
          gameB = undefined;
        } else {
          break;
        }
      }
      // gameA and gameB will always be found
      switchHomeAway(gameA!);
      switchHomeAway(gameB!);
    } else {
      const [tooManyHome] = Object.entries(homeAwayCounts).find(
        ([_, [home, away]]) => home - away > 1,
      ) ?? [null];
      if (tooManyHome !== null) {
        const game =
          // This will always find a pairing
          pairings.find(
            ([home, away]) =>
              home === tooManyHome &&
              homeAwayCounts[away][1] > homeAwayCounts[away][0],
          )!;
        switchHomeAway(game);
        return;
      }
      // No team has too many home games, so some team must have too many away games
      // This case is symmetrical to the one above
      const [tooManyAway] =
        // This will always find a pairing
        Object.entries(homeAwayCounts).find(
          ([_, [home, away]]) => away - home > 1,
        )!;
      const game =
        // This will always find a pairing
        pairings.find(
          ([home, away]) =>
            away === tooManyAway &&
            homeAwayCounts[home][0] > homeAwayCounts[home][1],
        )!;
      switchHomeAway(game);
    }
  }

  while (!isScheduleBalanced()) rebalance();

  return rounds;
}
