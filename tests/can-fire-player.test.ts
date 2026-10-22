import { describe, expect, it } from "vitest";
import { canFirePlayer } from "~/app/utils/can-fire-player";

function makePlayers(healthy: number, mng: number) {
  return [
    ...Array.from({ length: healthy }, (_, i) => ({
      id: `healthy-${i}`,
      membershipType: "player",
      missNextGame: false,
    })),
    ...Array.from({ length: mng }, (_, i) => ({
      id: `mng-${i}`,
      membershipType: "player",
      missNextGame: true,
    })),
  ];
}

describe("canFirePlayer", () => {
  it("refuses to fire anyone from exactly 11 healthy players", () => {
    expect(canFirePlayer("firing", makePlayers(11, 0), "healthy-0")).toBe(
      false,
    );
  });

  it("allows firing a healthy player when 12 are eligible", () => {
    expect(canFirePlayer("firing", makePlayers(12, 0), "healthy-0")).toBe(true);
  });

  it("refuses to fire a healthy player with 11 healthy and 3 MNG", () => {
    expect(canFirePlayer("firing", makePlayers(11, 3), "healthy-0")).toBe(
      false,
    );
  });

  it("allows firing an MNG player with 11 healthy and 3 MNG", () => {
    expect(canFirePlayer("firing", makePlayers(11, 3), "mng-0")).toBe(true);
  });

  it("refuses to fire an MNG player while fewer than 11 are eligible", () => {
    expect(canFirePlayer("firing", makePlayers(9, 3), "mng-0")).toBe(false);
  });

  it("does not count journeymen or retired players as eligible", () => {
    const players = [
      ...makePlayers(11, 0),
      { id: "jm", membershipType: "journeyman", missNextGame: false },
      { id: "ret", membershipType: "retired", missNextGame: false },
    ];
    expect(canFirePlayer("firing", players, "healthy-0")).toBe(false);
    expect(canFirePlayer("firing", players, "jm")).toBe(true);
  });

  it("ignores the minimum in draft", () => {
    expect(canFirePlayer("draft", makePlayers(11, 0), "healthy-0")).toBe(true);
  });

  it.each(["improving", "hiring", "ready", "playing"])(
    "refuses in %s",
    (state) => {
      expect(canFirePlayer(state, makePlayers(14, 0), "healthy-0")).toBe(false);
    },
  );
});
