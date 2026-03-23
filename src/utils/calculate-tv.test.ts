import { describe, expect, it } from "vitest";
import calculateTV from "./calculate-tv";
import { getPlayerSppAndTv } from "./get-computed-player-fields";

type Player = Parameters<typeof getPlayerSppAndTv>[0];
type Team = Parameters<typeof calculateTV>[0];

function mockPlayer(opts: {
  mvps?: number;
  touchdowns?: number;
  completions?: number;
  casualties?: number;
  safeLandings?: number;
  interceptions?: number;
  otherSPP?: number;
  specialRules?: string[];
}) {
  return {
    mvps: opts.mvps ?? 0,
    touchdowns: opts.touchdowns ?? 0,
    completions: opts.completions ?? 0,
    casualties: opts.casualties ?? 0,
    safeLandings: opts.safeLandings ?? 0,
    interceptions: opts.interceptions ?? 0,
    otherSPP: opts.otherSPP ?? 0,
    improvements: [],
    position: {
      cost: 50000,
      primary: ["G"],
      secondary: ["A", "S", "P"],
      rosterSlot: {
        max: 16,
        roster: {
          specialRuleToRoster:
            opts.specialRules?.map((r) => ({ specialRuleName: r })) ?? [],
        },
      },
    },
  } as unknown as Player;
}

describe("getPlayerSppAndTv", () => {
  it("calculates SPP correctly", () => {
    const { starPlayerPoints } = getPlayerSppAndTv(
      mockPlayer({
        mvps: 1,
        touchdowns: 1,
        completions: 1,
        casualties: 1,
        safeLandings: 1,
        interceptions: 1,
        otherSPP: 1,
      }),
    );
    expect(starPlayerPoints).toBe(4 + 3 + 1 + 2 + 1 + 2 + 1);
  });

  it("calculates SPP correctly for Brawlin' Brutes", () => {
    const { starPlayerPoints } = getPlayerSppAndTv(
      mockPlayer({
        touchdowns: 2,
        casualties: 3,
        specialRules: ["Brawlin' Brutes"],
      }),
    );
    expect(starPlayerPoints).toBe(2 * 2 + 3 * 3);
  });

  it("calculates team value correctly for a player with no improvements", () => {
    const { teamValue } = getPlayerSppAndTv(mockPlayer({}));
    expect(teamValue).toBe(50000);
  });

  it("handles Low Cost Linemen rule", () => {
    const { teamValue } = getPlayerSppAndTv(
      mockPlayer({ specialRules: ["Low Cost Linemen"] }),
    );
    expect(teamValue).toBe(0);
  });

  it("calculates team value and SPP cost for a chosen secondary skill", () => {
    const playerWithImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "chosen_skill",
          skill: { category: "A" },
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue, starPlayerPoints } = getPlayerSppAndTv(
      playerWithImprovement,
    );
    expect(teamValue).toBe(50000 + 40000);
    expect(starPlayerPoints).toBe(-10);
  });

  it("calculates team value and SPP cost for a random primary skill", () => {
    const playerWithImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "random_skill",
          skill: { category: "G" },
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue, starPlayerPoints } = getPlayerSppAndTv(
      playerWithImprovement,
    );
    expect(teamValue).toBe(50000 + 20000);
    expect(starPlayerPoints).toBe(-3);
  });

  it("includes extra TV for an elite skill", () => {
    const playerWithImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "random_skill",
          skill: { category: "G", elite: true },
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue } = getPlayerSppAndTv(playerWithImprovement);
    expect(teamValue).toBe(50000 + 20000 + 10000);
  });

  it("calculates team value and SPP cost for a stat increase", () => {
    const expectedSPP = -14;
    const playerWithMAImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "ma",
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue: teamValueMA, starPlayerPoints: sppMA } =
      getPlayerSppAndTv(playerWithMAImprovement);
    expect(teamValueMA).toBe(50000 + 20000);
    expect(sppMA).toBe(expectedSPP);

    const playerWithSTImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "st",
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue: teamValueST, starPlayerPoints: sppST } =
      getPlayerSppAndTv(playerWithSTImprovement);
    expect(teamValueST).toBe(50000 + 60000);
    expect(sppST).toBe(expectedSPP);

    const playerWithAGImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "ag",
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue: teamValueAG, starPlayerPoints: sppAG } =
      getPlayerSppAndTv(playerWithAGImprovement);
    expect(teamValueAG).toBe(50000 + 30000);
    expect(sppAG).toBe(expectedSPP);

    const playerWithPAImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "pa",
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue: teamValuePA, starPlayerPoints: sppPA } =
      getPlayerSppAndTv(playerWithPAImprovement);
    expect(teamValuePA).toBe(50000 + 20000);
    expect(sppPA).toBe(expectedSPP);

    const playerWithAVImprovement = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "av",
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue: teamValueAV, starPlayerPoints: sppAV } =
      getPlayerSppAndTv(playerWithAVImprovement);
    expect(teamValueAV).toBe(50000 + 10000);
    expect(sppAV).toBe(expectedSPP);
  });

  it("calculates team value and SPP cost for multiple improvements", () => {
    const playerWithImprovements = {
      ...mockPlayer({}),
      improvements: [
        {
          type: "chosen_skill",
          skill: { category: "G" },
          order: 0,
        },
        {
          type: "ma",
          order: 1,
        },
      ],
    } as unknown as Player;
    const { teamValue, starPlayerPoints } = getPlayerSppAndTv(
      playerWithImprovements,
    );
    expect(teamValue).toBe(50000 + 20000 + 20000);
    expect(starPlayerPoints).toBe(-6 - 16);
  });
});

const mockTeam = {
  players: [mockPlayer({})],
  journeymen: [],
  apothecary: true,
  assistantCoaches: 1,
  cheerleaders: 1,
  rerolls: 1,
  roster: { rerollCost: 50000 },
} as Team;

describe("calculateTV", () => {
  it("calculates the total team value correctly", () => {
    const teamValue = calculateTV(mockTeam);
    expect(teamValue).toBe(50000 + 50000 + 10000 + 10000 + 50000);
  });

  it("includes journeymen in the team value calculation", () => {
    const teamWithJourneymen = {
      ...mockTeam,
      journeymen: [
        {
          ...mockPlayer({}),
          position: {
            ...mockPlayer({}).position,
            cost: 60000,
          },
        },
      ],
    } as Team;
    const teamValue = calculateTV(teamWithJourneymen);
    expect(teamValue).toBe(50000 + 60000 + 50000 + 10000 + 10000 + 50000);
  });
});
