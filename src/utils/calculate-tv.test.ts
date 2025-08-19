import { describe, expect, it } from "vitest";
import calculateTV from "./calculate-tv";
import { getPlayerSppAndTv } from "./get-computed-player-fields";
import { w } from "@faker-js/faker/dist/airline-CLphikKp";

type Player = Parameters<typeof getPlayerSppAndTv>[0];
type Team = Parameters<typeof calculateTV>[0];

const mockPlayer = {
  mvps: 1,
  touchdowns: 1,
  completions: 1,
  casualties: 1,
  deflections: 1,
  interceptions: 1,
  improvements: [],
  position: {
    cost: 50000,
    primary: ["G"],
    secondary: ["A", "S", "P"],
    rosterSlot: {
      max: 16,
      roster: {
        specialRuleToRoster: [],
      },
    },
  },
} as unknown as Player;

describe("getPlayerSppAndTv", () => {
  it("calculates SPP correctly", () => {
    const { starPlayerPoints } = getPlayerSppAndTv(mockPlayer);
    expect(starPlayerPoints).toBe(1 + 1 + 1 + 2 + 3 + 4);
  });

  it("calculates team value correctly for a player with no improvements", () => {
    const { teamValue } = getPlayerSppAndTv(mockPlayer);
    expect(teamValue).toBe(50000);
  });

  it("handles Low Cost Linemen rule", () => {
    const playerWithRule = {
      ...mockPlayer,
      position: {
        ...mockPlayer.position,
        rosterSlot: {
          roster: {
            specialRuleToRoster: [{ specialRuleName: "Low Cost Linemen" }],
          },
        },
      },
    } as Player;
    const { teamValue } = getPlayerSppAndTv(playerWithRule);
    expect(teamValue).toBe(0);
  });

  it("calculates team value and SPP cost for a chosen secondary skill", () => {
    const playerWithImprovement = {
      ...mockPlayer,
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
    expect(starPlayerPoints).toBe(1 + 1 + 1 + 2 + 3 + 4 - 12);
  });

  it("calculates team value and SPP cost for a random primary skill", () => {
    const playerWithImprovement = {
      ...mockPlayer,
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
    expect(teamValue).toBe(50000 + 10000);
    expect(starPlayerPoints).toBe(1 + 1 + 1 + 2 + 3 + 4 - 3);
  });

  it("calculates team value and SPP cost for a stat increase", () => {
    const expectedSPP = 1 + 1 + 1 + 2 + 3 + 4 - 18;
    const playerWithMAImprovement = {
      ...mockPlayer,
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
      ...mockPlayer,
      improvements: [
        {
          type: "st",
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue: teamValueST, starPlayerPoints: sppST } =
      getPlayerSppAndTv(playerWithSTImprovement);
    expect(teamValueST).toBe(50000 + 80000);
    expect(sppST).toBe(expectedSPP);

    const playerWithAGImprovement = {
      ...mockPlayer,
      improvements: [
        {
          type: "ag",
          order: 0,
        },
      ],
    } as unknown as Player;
    const { teamValue: teamValueAG, starPlayerPoints: sppAG } =
      getPlayerSppAndTv(playerWithAGImprovement);
    expect(teamValueAG).toBe(50000 + 40000);
    expect(sppAG).toBe(expectedSPP);

    const playerWithPAImprovement = {
      ...mockPlayer,
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
      ...mockPlayer,
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
      ...mockPlayer,
      mvps: 5,
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
    expect(starPlayerPoints).toBe(1 + 1 + 1 + 2 + 3 + 4 * 5 - 6 - 20);
  });
});

const mockTeam = {
  players: [mockPlayer],
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
          ...mockPlayer,
          position: {
            ...mockPlayer.position,
            cost: 60000,
          },
        },
      ],
    } as Team;
    const teamValue = calculateTV(teamWithJourneymen);
    expect(teamValue).toBe(50000 + 60000 + 50000 + 10000 + 10000 + 50000);
  });
});
