import { describe, it, expect, vi } from "vitest";
import {
  processGameEvents,
  calculateWinnings,
} from "~/app/routes/game/process-game-events";

// d6 is called inside processGameEvents for hatred rolls — mock it to be deterministic
vi.mock("~/app/utils/d6", () => ({ d6: vi.fn(() => 6) }));

const basePlayer = (id: string) => ({
  id,
  missNextGame: false,
  improvements: [],
  position: { keywords: [] },
});

const hatedKeywordPlayer = (id: string) => ({
  ...basePlayer(id),
  position: {
    keywords: [{ name: "Undead", canBeHated: true }],
  },
});

describe("processGameEvents", () => {
  it("counts touchdowns per team", () => {
    const home = basePlayer("h1");
    const away = basePlayer("a1");
    const { touchdowns } = processGameEvents(
      [
        { type: "touchdown", player: "h1", playerType: "player" },
        { type: "touchdown", player: "h1", playerType: "player" },
        { type: "touchdown", player: "a1", playerType: "player" },
      ],
      [home],
      [away],
      [],
      [],
      [],
    );
    expect(touchdowns).toEqual([2, 1]);
  });

  it("star player touchdowns don't count toward player SPP", () => {
    const home = basePlayer("h1");
    const { playerUpdates } = processGameEvents(
      [{ type: "touchdown", player: "h1", playerType: "star" }],
      [home],
      [],
      [],
      [],
      [],
    );
    expect(playerUpdates["h1"].touchdowns).toBeUndefined();
  });

  it("counts player-caused casualties per team", () => {
    const home = basePlayer("h1");
    const away = basePlayer("a1");
    const { casualties, playerUpdates } = processGameEvents(
      [
        {
          type: "casualty",
          player: "a1",
          injury: {
            type: "bh",
            causedBy: { player: "h1", type: "player", hatredKeyword: "" },
          },
        },
      ],
      [home],
      [away],
      [],
      [],
      [],
    );
    expect(casualties).toEqual([1, 0]);
    expect(playerUpdates["h1"].casualties).toBe(1);
  });

  it("applies stat injuries and missNextGame", () => {
    const home = basePlayer("h1");
    const away = basePlayer("a1");
    const { playerUpdates } = processGameEvents(
      [
        {
          type: "casualty",
          player: "a1",
          injury: { type: "ma" },
        },
      ],
      [home],
      [away],
      [],
      [],
      [],
    );
    expect(playerUpdates["a1"].missNextGame).toBe(true);
    expect(playerUpdates["a1"].maInjuries).toBe(1);
  });

  it("marks dead players and removes from team", () => {
    const away = basePlayer("a1");
    const { playerUpdates } = processGameEvents(
      [{ type: "casualty", player: "a1", injury: { type: "dead" } }],
      [],
      [away],
      [],
      [],
      [],
    );
    expect(playerUpdates["a1"].dead).toBe(true);
    expect(playerUpdates["a1"].teamId).toBeNull();
    expect(playerUpdates["a1"].membershipType).toBeNull();
  });

  it("records hatredNeeded when d6 >= 4 and injury is not bh", () => {
    const home = hatedKeywordPlayer("h1");
    const away = basePlayer("a1");
    const { hatredNeeded } = processGameEvents(
      [
        {
          type: "casualty",
          player: "a1",
          injury: {
            type: "mng",
            causedBy: { player: "h1", type: "player", hatredKeyword: "Undead" },
          },
        },
      ],
      [home],
      [away],
      [],
      [],
      [],
    );
    expect(hatredNeeded).toHaveLength(1);
    expect(hatredNeeded[0].keyword).toBe("Undead");
    expect(hatredNeeded[0].playerId).toBe("a1");
  });

  it("throws on invalid hatred keyword", () => {
    const home = hatedKeywordPlayer("h1");
    const away = basePlayer("a1");
    expect(() =>
      processGameEvents(
        [
          {
            type: "casualty",
            player: "a1",
            injury: {
              type: "mng",
              causedBy: {
                player: "h1",
                type: "player",
                hatredKeyword: "NotAKeyword",
              },
            },
          },
        ],
        [home],
        [away],
        [],
        [],
        [],
      ),
    ).toThrow("Invalid keyword chosen for Hatred");
  });

  it("throws when event references unknown player", () => {
    expect(() =>
      processGameEvents(
        [{ type: "completion", player: "unknown" }],
        [],
        [],
        [],
        [],
        [],
      ),
    ).toThrow("Event references a player not on any team");
  });
});

describe("calculateWinnings", () => {
  it("awards TDs, shared fan winnings, and attendance bonus", () => {
    const { homeWinnings, awayWinnings } = calculateWinnings(
      3,
      1,
      4,
      3,
      false,
      false,
    );
    const sharedWinnings = ((4 + 3) / 2) * 10_000; // 35_000
    expect(homeWinnings).toBe(3 * 10_000 + sharedWinnings + 10_000); // 75_000
    expect(awayWinnings).toBe(1 * 10_000 + sharedWinnings + 10_000); // 55_000
  });

  it("deducts attendance bonus for stalled team", () => {
    const { homeWinnings, awayWinnings } = calculateWinnings(
      1,
      1,
      2,
      2,
      true,
      false,
    );
    const sharedWinnings = 2 * 10_000; // 20_000
    expect(homeWinnings).toBe(1 * 10_000 + sharedWinnings); // no bonus
    expect(awayWinnings).toBe(1 * 10_000 + sharedWinnings + 10_000);
  });
});
