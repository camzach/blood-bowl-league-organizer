import { describe, expect, it } from "vitest";
import { canActOnGame } from "~/app/routes/game/can-act-on-game";

const game = {
  homeDetails: { team: { coaches: [{ id: "home-coach" }] } },
  awayDetails: {
    team: { coaches: [{ id: "away-coach" }, { id: "assistant" }] },
  },
};

describe("canActOnGame", () => {
  it("allows a coach of the home team", () => {
    expect(canActOnGame({ id: "home-coach", role: "user" }, game)).toBe(true);
  });

  it("allows a coach of the away team", () => {
    expect(canActOnGame({ id: "away-coach", role: "user" }, game)).toBe(true);
    expect(canActOnGame({ id: "assistant", role: "user" }, game)).toBe(true);
  });

  it("denies a user who coaches neither team", () => {
    expect(canActOnGame({ id: "stranger", role: "user" }, game)).toBe(false);
  });

  it("denies a user with no role who coaches neither team", () => {
    expect(canActOnGame({ id: "stranger" }, game)).toBe(false);
    expect(canActOnGame({ id: "stranger", role: null }, game)).toBe(false);
  });

  it("allows an admin who coaches neither team", () => {
    expect(canActOnGame({ id: "admin", role: "admin" }, game)).toBe(true);
  });

  it("denies a non-admin when the teams have no coaches", () => {
    const uncoached = {
      homeDetails: { team: { coaches: [] } },
      awayDetails: { team: { coaches: [] } },
    };
    expect(canActOnGame({ id: "stranger", role: "user" }, uncoached)).toBe(
      false,
    );
  });

  it("denies a non-admin when a team slot is empty", () => {
    expect(
      canActOnGame(
        { id: "stranger", role: "user" },
        { homeDetails: null, awayDetails: null },
      ),
    ).toBe(false);
  });
});
