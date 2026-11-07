import { describe, expect, it } from "vitest";
import { canActOnGame } from "~/app/routes/game/can-act-on-game";

const team = (leagueId: string, coaches: string[]) => ({
  leagueId,
  coaches: coaches.map((id) => ({ id })),
});

const game = {
  homeDetails: { team: team("league-1", ["home-coach"]) },
  awayDetails: { team: team("league-1", ["away-coach", "assistant"]) },
};

const member = { id: "league-1", role: "member" } as const;
const admin = { id: "league-1", role: "admin" } as const;
const owner = { id: "league-1", role: "owner" } as const;

describe("canActOnGame", () => {
  it("allows a coach of the home team", () => {
    expect(canActOnGame({ id: "home-coach" }, member, game)).toBe(true);
  });

  it("allows a coach of the away team", () => {
    expect(canActOnGame({ id: "away-coach" }, member, game)).toBe(true);
    expect(canActOnGame({ id: "assistant" }, member, game)).toBe(true);
  });

  it("denies a member who coaches neither team", () => {
    expect(canActOnGame({ id: "stranger" }, member, game)).toBe(false);
  });

  it("denies a user with no active league who coaches neither team", () => {
    expect(canActOnGame({ id: "stranger" }, null, game)).toBe(false);
  });

  it("allows a league admin or owner who coaches neither team", () => {
    expect(canActOnGame({ id: "stranger" }, admin, game)).toBe(true);
    expect(canActOnGame({ id: "stranger" }, owner, game)).toBe(true);
  });

  it("denies an admin of a different league", () => {
    const otherLeagueAdmin = { id: "league-2", role: "admin" } as const;
    expect(canActOnGame({ id: "stranger" }, otherLeagueAdmin, game)).toBe(
      false,
    );
  });

  it("denies a league admin when the teams have no coaches and are in another league", () => {
    const uncoached = {
      homeDetails: { team: team("league-2", []) },
      awayDetails: { team: team("league-2", []) },
    };
    expect(canActOnGame({ id: "stranger" }, admin, uncoached)).toBe(false);
  });

  it("denies a non-admin when the teams have no coaches", () => {
    const uncoached = {
      homeDetails: { team: team("league-1", []) },
      awayDetails: { team: team("league-1", []) },
    };
    expect(canActOnGame({ id: "stranger" }, member, uncoached)).toBe(false);
  });

  it("denies everyone when a team slot is empty, unless they coach", () => {
    expect(
      canActOnGame({ id: "stranger" }, admin, {
        homeDetails: null,
        awayDetails: null,
      }),
    ).toBe(false);
  });
});
