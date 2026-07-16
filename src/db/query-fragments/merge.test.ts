import { describe, it, expect } from "vitest";
import { mergeQueryFragments } from "./merge";

describe("mergeQueryFragments", () => {
  it("should merge simple with clauses", () => {
    const base = {
      with: {
        team: true,
        player: true,
      },
    };

    const override = {
      with: {
        game: true,
      },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with).toEqual({
      team: true,
      player: true,
      game: true,
    });
  });

  it("should recursively merge nested with clauses", () => {
    const base = {
      with: {
        team: {
          columns: { name: true, id: true },
          with: { song: true, roster: true },
        },
      },
    };

    const override = {
      with: {
        team: {
          with: { players: true },
        },
      },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with.team.columns).toEqual({ name: true, id: true });
    expect(result.with.team.with).toEqual({
      song: true,
      roster: true,
      players: true,
    });
  });

  it("should preserve base properties not in override", () => {
    const base = {
      with: {
        team: {
          columns: { name: true },
          with: { roster: true },
        },
        player: true,
      },
    };

    const override = {
      with: {
        team: {
          with: { players: true },
        },
      },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with.player).toBe(true);
    expect(result.with.team.columns).toEqual({ name: true });
    expect(result.with.team.with).toEqual({
      roster: true,
      players: true,
    });
  });

  it("should override non-object values", () => {
    const base = {
      with: {
        team: true,
      },
    };

    const override = {
      with: {
        team: {
          columns: { name: true },
        },
      },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with.team).toEqual({
      columns: { name: true },
    });
  });

  it("should merge columns", () => {
    const base = {
      columns: { id: true, name: true },
    };

    const override = {
      columns: { email: true },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.columns).toEqual({
      id: true,
      name: true,
      email: true,
    });
  });

  it("should handle where clauses", () => {
    const base = {
      with: { team: true },
    };

    const override = {
      where: "some condition",
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with).toEqual({ team: true });
    expect(result.where).toBe("some condition");
  });

  it("should handle deeply nested structures", () => {
    const base = {
      with: {
        team: {
          with: {
            roster: {
              with: {
                specialRuleToRoster: true,
              },
            },
          },
        },
      },
    };

    const override = {
      with: {
        team: {
          with: {
            roster: {
              with: {
                rosterSlots: true,
              },
            },
            players: true,
          },
        },
      },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with.team.with.roster.with).toEqual({
      specialRuleToRoster: true,
      rosterSlots: true,
    });
    expect(result.with.team.with.players).toBe(true);
  });

  it("should handle empty override", () => {
    const base = {
      with: { team: true },
      columns: { id: true },
    };

    const override = {};

    const result = mergeQueryFragments(base, override);

    expect(result).toEqual(base);
  });

  it("should handle empty base", () => {
    const base = {};

    const override = {
      with: { team: true },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with).toEqual({ team: true });
  });

  it("should preserve spread syntax in with clauses", () => {
    const playerFragment = {
      with: {
        position: true,
        improvements: true,
      },
    };

    const base = {
      with: {
        team: {
          with: {
            roster: true,
          },
        },
      },
    };

    const override = {
      with: {
        team: {
          with: {
            players: {
              where: "some condition",
              ...playerFragment,
            },
          },
        },
      },
    };

    const result = mergeQueryFragments(base, override);

    expect(result.with.team.with.roster).toBe(true);
    expect(result.with.team.with.players).toEqual({
      where: "some condition",
      with: {
        position: true,
        improvements: true,
      },
    });
  });
});
