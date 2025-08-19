import { describe, expect, it } from "vitest";
import { generateSchedule } from "./schedule-generator";

describe("generateSchedule", () => {
  it("should generate an empty schedule for an empty team list", () => {
    const teams: string[] = [];
    const schedule = generateSchedule(teams);
    expect(schedule).toEqual([]);
  });

  it("should generate an empty schedule for a single team", () => {
    const teams = ["Team A"];
    const schedule = generateSchedule(teams);
    expect(schedule).toEqual([]);
  });

  it("should generate a schedule for an even number of teams", () => {
    const teams = ["Team A", "Team B", "Team C", "Team D"];
    const schedule = generateSchedule(teams);

    // Expect 3 rounds for 4 teams (n-1 rounds)
    expect(schedule.length).toBe(teams.length - 1);

    // Each round should have n/2 games
    schedule.forEach((round) => {
      expect(round.length).toBe(teams.length / 2);
    });

    // Verify all teams play in each round
    schedule.forEach((round) => {
      const teamsInRound = new Set<string>();
      round.forEach(([home, away]) => {
        teamsInRound.add(home);
        teamsInRound.add(away);
      });
      expect(teamsInRound.size).toBe(teams.length);
    });

    // Verify no team plays itself
    schedule.forEach((round) => {
      round.forEach(([home, away]) => {
        expect(home).not.toBe(away);
      });
    });

    // Verify each team plays every other team exactly once
    const allPairings = schedule.flat();
    for (let team1Idx = 0; team1Idx < teams.length; team1Idx++) {
      for (let team2Idx = team1Idx + 1; team2Idx < teams.length; team2Idx++) {
        const team1 = teams[team1Idx];
        const team2 = teams[team2Idx];
        const match = [team1, team2].sort().join("-");
        const count = allPairings.filter(
          ([home, away]) => [home, away].sort().join("-") === match,
        ).length;
        expect(count).toBe(1);
      }
    }

    // Verify home/away balance
    const homeAwayCounts: Record<string, { home: number; away: number }> = {};
    teams.forEach((team) => (homeAwayCounts[team] = { home: 0, away: 0 }));

    allPairings.forEach(([home, away]) => {
      homeAwayCounts[home].home++;
      homeAwayCounts[away].away++;
    });

    Object.values(homeAwayCounts).forEach((counts) => {
      expect(Math.abs(counts.home - counts.away)).toBeLessThanOrEqual(1);
    });
  });

  it("should generate a schedule for an odd number of teams", () => {
    const teams = ["Team A", "Team B", "Team C"];
    const schedule = generateSchedule(teams);

    // Expect n rounds for n teams (n rounds, as one team has a bye each round)
    expect(schedule.length).toBe(teams.length);

    // Each round should have (n-1)/2 games
    schedule.forEach((round) => {
      expect(round.length).toBe((teams.length - 1) / 2);
    });

    // Verify all teams play in each round (except for the bye team)
    schedule.forEach((round) => {
      const teamsInRound = new Set<string>();
      round.forEach(([home, away]) => {
        teamsInRound.add(home);
        teamsInRound.add(away);
      });
      expect(teamsInRound.size).toBe(teams.length - 1); // One team has a bye
    });

    // Verify no team plays itself
    schedule.forEach((round) => {
      round.forEach(([home, away]) => {
        expect(home).not.toBe(away);
      });
    });

    // Verify each team plays every other team exactly once
    const allPairings = schedule.flat();
    for (let team1Idx = 0; team1Idx < teams.length; team1Idx++) {
      for (let team2Idx = team1Idx + 1; team2Idx < teams.length; team2Idx++) {
        const team1 = teams[team1Idx];
        const team2 = teams[team2Idx];
        const match = [team1, team2].sort().join("-");
        const count = allPairings.filter(
          ([home, away]) => [home, away].sort().join("-") === match,
        ).length;
        expect(count).toBe(1);
      }
    }

    // Verify home/away balance
    const homeAwayCounts: Record<string, { home: number; away: number }> = {};
    teams.forEach((team) => (homeAwayCounts[team] = { home: 0, away: 0 }));

    allPairings.forEach(([home, away]) => {
      homeAwayCounts[home].home++;
      homeAwayCounts[away].away++;
    });

    Object.values(homeAwayCounts).forEach((counts) => {
      expect(Math.abs(counts.home - counts.away)).toBe(0); // For odd teams, home/away should be perfectly balanced
    });
  });

  it("should generate a schedule for 6 teams", () => {
    const teams = ["T1", "T2", "T3", "T4", "T5", "T6"];
    const schedule = generateSchedule(teams);

    expect(schedule.length).toBe(5); // n-1 rounds
    schedule.forEach((round) => {
      expect(round.length).toBe(3); // n/2 games
    });

    const allPairings = schedule.flat();
    teams.forEach((team1) => {
      teams.forEach((team2) => {
        if (team1 !== team2) {
          const match = [team1, team2].sort().join("-");
          const count = allPairings.filter(
            ([home, away]) => [home, away].sort().join("-") === match,
          ).length;
          expect(count).toBe(1);
        }
      });
    });

    const homeAwayCounts: Record<string, { home: number; away: number }> = {};
    teams.forEach((team) => (homeAwayCounts[team] = { home: 0, away: 0 }));

    allPairings.forEach(([home, away]) => {
      homeAwayCounts[home].home++;
      homeAwayCounts[away].away++;
    });

    Object.values(homeAwayCounts).forEach((counts) => {
      expect(Math.abs(counts.home - counts.away)).toBeLessThanOrEqual(1);
    });
  });

  it("should generate a schedule for 5 teams", () => {
    const teams = ["T1", "T2", "T3", "T4", "T5"];
    const schedule = generateSchedule(teams);

    expect(schedule.length).toBe(5); // n rounds
    schedule.forEach((round) => {
      expect(round.length).toBe(2); // (n-1)/2 games
    });

    const allPairings = schedule.flat();
    teams.forEach((team1) => {
      teams.forEach((team2) => {
        if (team1 !== team2) {
          const match = [team1, team2].sort().join("-");
          const count = allPairings.filter(
            ([home, away]) => [home, away].sort().join("-") === match,
          ).length;
          expect(count).toBe(1);
        }
      });
    });

    const homeAwayCounts: Record<string, { home: number; away: number }> = {};
    teams.forEach((team) => (homeAwayCounts[team] = { home: 0, away: 0 }));

    allPairings.forEach(([home, away]) => {
      homeAwayCounts[home].home++;
      homeAwayCounts[away].away++;
    });

    Object.values(homeAwayCounts).forEach((counts) => {
      expect(Math.abs(counts.home - counts.away)).toBe(0);
    });
  });
});
