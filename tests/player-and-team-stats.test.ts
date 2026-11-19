import { describe, expect, it } from "vitest";
import calculateTV from "~/app/utils/calculate-tv";
import {
  getPlayerSkills,
  getPlayerSppAndTv,
  getPlayerStats,
} from "~/app/utils/get-computed-player-fields";

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
          specialRules: opts.specialRules?.map((r) => ({ name: r })) ?? [],
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

describe("getPlayerStats", () => {
  const basePosition = { ma: 6, st: 3, ag: 3, pa: 4, av: 8 };

  function mockStatPlayer(opts: {
    position?:
      | typeof basePosition
      | (Omit<typeof basePosition, "pa"> & { pa: number | null });
    maInjuries?: number;
    stInjuries?: number;
    agInjuries?: number;
    avInjuries?: number;
    improvements?: Array<{ type: string }>;
  }) {
    return {
      position: opts.position ?? basePosition,
      maInjuries: opts.maInjuries ?? 0,
      stInjuries: opts.stInjuries ?? 0,
      agInjuries: opts.agInjuries ?? 0,
      avInjuries: opts.avInjuries ?? 0,
      improvements: opts.improvements ?? [],
    } as Parameters<typeof getPlayerStats>[0];
  }

  it("returns base position stats when player has no injuries or improvements", () => {
    const stats = getPlayerStats(mockStatPlayer({}));
    expect(stats).toEqual({ ma: 6, st: 3, ag: 3, pa: 4, av: 8 });
  });

  it("applies stat injuries correctly", () => {
    const stats = getPlayerStats(
      mockStatPlayer({
        maInjuries: 1,
        stInjuries: 1,
        avInjuries: 1,
        agInjuries: 1,
      }),
    );
    expect(stats).toEqual({
      ma: 5,
      st: 2,
      ag: 4, // target roll worsens (increases)
      pa: 4,
      av: 7,
    });
  });

  it("applies characteristic improvements correctly", () => {
    const stats = getPlayerStats(
      mockStatPlayer({
        improvements: [
          { type: "ma" },
          { type: "st" },
          { type: "av" },
          { type: "ag" },
          { type: "pa" },
        ],
      }),
    );
    expect(stats).toEqual({
      ma: 7,
      st: 4,
      ag: 2, // target roll improves (decreases)
      pa: 3, // target roll improves (decreases)
      av: 9,
    });
  });

  it("initializes null PA to 6 on first PA improvement", () => {
    const stats = getPlayerStats(
      mockStatPlayer({
        position: { ma: 6, st: 3, ag: 3, pa: null, av: 8 },
        improvements: [{ type: "pa" }],
      }),
    );
    expect(stats.pa).toBe(6);
  });

  it("decrements PA on subsequent PA improvements after initializing null PA", () => {
    const stats = getPlayerStats(
      mockStatPlayer({
        position: { ma: 6, st: 3, ag: 3, pa: null, av: 8 },
        improvements: [{ type: "pa" }, { type: "pa" }],
      }),
    );
    expect(stats.pa).toBe(5);
  });

  it("combines injuries and improvements accurately", () => {
    const stats = getPlayerStats(
      mockStatPlayer({
        maInjuries: 1,
        agInjuries: 1,
        improvements: [{ type: "ma" }, { type: "ag" }, { type: "st" }],
      }),
    );
    expect(stats).toEqual({
      ma: 6, // 6 - 1 + 1
      st: 4, // 3 + 1
      ag: 3, // 3 + 1 - 1
      pa: 4,
      av: 8,
    });
  });
});

describe("getPlayerSkills", () => {
  type Skill = NonNullable<Parameters<typeof getPlayerSkills>[1]>;

  const dodgeSkill = {
    name: "Dodge",
    category: "A",
    elite: false,
  } as unknown as Skill;
  const blockSkill = {
    name: "Block",
    category: "G",
    elite: false,
  } as unknown as Skill;
  const proSkill = {
    name: "Pro",
    category: "G",
    elite: false,
  } as unknown as Skill;

  it("returns base position skills when there are no improvements and not captain", () => {
    const skills = getPlayerSkills({
      position: { skills: [dodgeSkill] },
      improvements: [],
      isCaptain: false,
    });
    expect(skills).toEqual([dodgeSkill]);
  });

  it("combines position skills with skills from improvements, filtering out nulls", () => {
    const skills = getPlayerSkills({
      position: { skills: [dodgeSkill] },
      improvements: [
        { skill: blockSkill },
        { skill: null }, // e.g. stat improvement
      ],
      isCaptain: false,
    });
    expect(skills).toEqual([dodgeSkill, blockSkill]);
  });

  it("appends Pro skill when player is captain and proSkill is provided", () => {
    const skills = getPlayerSkills(
      {
        position: { skills: [dodgeSkill] },
        improvements: [{ skill: blockSkill }],
        isCaptain: true,
      },
      proSkill,
    );
    expect(skills).toEqual([dodgeSkill, blockSkill, proSkill]);
  });

  it("does not append Pro skill when player is not captain even if proSkill is provided", () => {
    const skills = getPlayerSkills(
      {
        position: { skills: [dodgeSkill] },
        improvements: [],
        isCaptain: false,
      },
      proSkill,
    );
    expect(skills).toEqual([dodgeSkill]);
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
