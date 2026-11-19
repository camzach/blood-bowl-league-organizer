import { describe, expect, test } from "vitest";
import {
  computeLeagueTable,
  sortLeagueTable,
  type TeamStats,
} from "~/app/utils/league-table";

function side(id: string, touchdowns: number, casualties: number) {
  return { touchdowns, casualties, team: { id, name: `Team ${id}` } };
}

function played(
  home: ReturnType<typeof side>,
  away: ReturnType<typeof side>,
  state = "complete",
) {
  return { game: { state, homeDetails: home, awayDetails: away } };
}

describe("computeLeagueTable points", () => {
  test.each([
    ["a home win", [2, 0], [1, 0], 3, 0],
    ["an away win", [1, 0], [2, 0], 0, 3],
    ["a draw", [1, 0], [1, 0], 1, 1],
    ["a home win with a shutout", [1, 0], [0, 0], 4, 0],
    ["an away win with a shutout", [0, 0], [1, 0], 0, 4],
    ["a home win with 3 touchdowns", [3, 0], [1, 0], 4, 0],
    ["an away win with 3 touchdowns", [1, 0], [3, 0], 0, 4],
    ["a home loss with 3 touchdowns", [3, 0], [4, 0], 1, 4],
    ["an away loss with 3 touchdowns", [4, 0], [3, 0], 4, 1],
    ["a draw with 3 touchdowns each", [3, 0], [3, 0], 2, 2],
    ["a draw with 2 touchdowns each", [2, 0], [2, 0], 1, 1],
    ["a nil-nil draw", [0, 0], [0, 0], 2, 2],
    ["a home win with a shutout and 4 touchdowns", [4, 0], [0, 0], 5, 0],
    ["3 casualties for the home team", [1, 3], [1, 0], 2, 1],
    ["3 casualties for the away team", [1, 0], [1, 3], 1, 2],
    ["2 casualties each", [1, 2], [1, 2], 1, 1],
    ["casualties for the loser", [1, 0], [2, 4], 0, 4],
    ["everything at once", [4, 3], [0, 3], 6, 1],
  ])(
    "%s",
    (_, [homeTd, homeCas], [awayTd, awayCas], homePoints, awayPoints) => {
      const table = computeLeagueTable([
        played(side("h", homeTd, homeCas), side("a", awayTd, awayCas)),
      ]);

      expect(table.h.points).toBe(homePoints);
      expect(table.a.points).toBe(awayPoints);
    },
  );
});

describe("computeLeagueTable stats", () => {
  test("records, touchdowns, casualties and differences add up across games", () => {
    const table = computeLeagueTable([
      played(side("a", 2, 1), side("b", 1, 0)),
      played(side("c", 0, 2), side("a", 1, 4)),
      played(side("b", 2, 2), side("c", 2, 1)),
    ]);

    expect(table.a).toMatchObject({
      wins: 2,
      losses: 0,
      draws: 0,
      td: 3,
      cas: 5,
      tdDiff: 2,
      casDiff: 3,
    });
    expect(table.b).toMatchObject({
      wins: 0,
      losses: 1,
      draws: 1,
      td: 3,
      cas: 2,
      tdDiff: -1,
      casDiff: 0,
    });
    expect(table.c).toMatchObject({
      wins: 0,
      losses: 1,
      draws: 1,
      td: 2,
      cas: 3,
      tdDiff: -1,
      casDiff: -3,
    });
  });

  test("a team keeps its name", () => {
    const table = computeLeagueTable([
      played(side("a", 1, 0), side("b", 0, 0)),
    ]);

    expect(table.a.name).toBe("Team a");
    expect(table.b.name).toBe("Team b");
  });
});

describe("computeLeagueTable games that do not count", () => {
  test("a game that has not finished scores nothing but lists both teams", () => {
    const table = computeLeagueTable([
      played(side("a", 3, 3), side("b", 0, 0), "in_progress"),
      played(side("c", 3, 3), side("d", 0, 0), "scheduled"),
    ]);

    expect(Object.keys(table).sort()).toEqual(["a", "b", "c", "d"]);
    for (const stats of Object.values(table)) {
      expect(stats).toMatchObject({
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        td: 0,
        cas: 0,
        tdDiff: 0,
        casDiff: 0,
      });
    }
  });

  test("a bye scores nothing and adds no team", () => {
    const table = computeLeagueTable([
      { game: { state: "complete", homeDetails: side("a", 0, 0) } },
      { game: { state: "complete", awayDetails: side("b", 0, 0) } },
      { game: null },
    ]);

    expect(Object.keys(table).sort()).toEqual(["a", "b"]);
    expect(table.a.points).toBe(0);
    expect(table.b.points).toBe(0);
  });

  test("no games gives an empty table", () => {
    expect(computeLeagueTable([])).toEqual({});
  });
});

function stats(
  name: string,
  points: number,
  tdDiff: number,
  casDiff: number,
): TeamStats {
  return {
    name,
    points,
    wins: 0,
    losses: 0,
    draws: 0,
    td: 0,
    cas: 0,
    tdDiff,
    casDiff,
  };
}

function order(table: Record<string, TeamStats>) {
  return sortLeagueTable(table).map(([id]) => id);
}

describe("sortLeagueTable", () => {
  test("more points rank higher", () => {
    expect(
      order({
        a: stats("a", 3, 0, 0),
        b: stats("b", 9, 0, 0),
        c: stats("c", 6, 0, 0),
      }),
    ).toEqual(["b", "c", "a"]);
  });

  test("points outrank a better touchdown difference", () => {
    expect(order({ a: stats("a", 4, 9, 9), b: stats("b", 5, -9, -9) })).toEqual(
      ["b", "a"],
    );
  });

  test("equal points are split by touchdown difference", () => {
    expect(
      order({
        a: stats("a", 6, 1, 5),
        b: stats("b", 6, 3, 0),
        c: stats("c", 6, -2, 9),
      }),
    ).toEqual(["b", "a", "c"]);
  });

  test("equal points and touchdown difference are split by casualty difference", () => {
    expect(
      order({
        a: stats("a", 6, 2, -1),
        b: stats("b", 6, 2, 4),
        c: stats("c", 6, 2, 0),
      }),
    ).toEqual(["b", "c", "a"]);
  });

  test("teams level on everything keep their order", () => {
    expect(
      order({
        a: stats("a", 6, 2, 1),
        b: stats("b", 6, 2, 1),
        c: stats("c", 6, 2, 1),
      }),
    ).toEqual(["a", "b", "c"]);
  });

  test("an empty table sorts to nothing", () => {
    expect(sortLeagueTable({})).toEqual([]);
  });

  test("the entries keep their stats", () => {
    expect(sortLeagueTable({ a: stats("Alpha", 1, 2, 3) })).toEqual([
      ["a", stats("Alpha", 1, 2, 3)],
    ]);
  });
});
