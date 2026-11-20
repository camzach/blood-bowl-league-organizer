import { describe, expect, it } from "vitest";
import { buildCalendar, type CalendarGame } from "~/app/utils/calendar";

const scheduledTime = new Date("2030-07-10T10:00:00Z");

const gameBetween = (
  id: string,
  home: { teamId: string; name: string } | null,
  away: { teamId: string; name: string } | null,
  time: Date | null = scheduledTime,
): CalendarGame => ({
  id,
  scheduledTime: time,
  homeDetails: home && { teamId: home.teamId, team: { name: home.name } },
  awayDetails: away && { teamId: away.teamId, team: { name: away.name } },
});

const orcs = { teamId: "orcs", name: "Orcs" };
const elves = { teamId: "elves", name: "Elves" };
const dwarfs = { teamId: "dwarfs", name: "Dwarfs" };

describe("buildCalendar", () => {
  it("lists a game as away at home", () => {
    const calendar = buildCalendar([gameBetween("g1", orcs, elves)], []);

    expect(calendar).toContain("SUMMARY:Elves @ Orcs");
  });

  it("leaves out a game with no time", () => {
    const calendar = buildCalendar(
      [gameBetween("g1", orcs, elves, null), gameBetween("g2", orcs, dwarfs)],
      [],
    );

    expect(calendar).not.toContain("SUMMARY:Elves @ Orcs");
    expect(calendar).toContain("SUMMARY:Dwarfs @ Orcs");
  });

  it("names a team that is not decided yet TBD", () => {
    const calendar = buildCalendar([gameBetween("g1", orcs, null)], []);

    expect(calendar).toContain("SUMMARY:TBD @ Orcs");
  });

  it("with team ids keeps only games that one of those teams plays in", () => {
    const calendar = buildCalendar(
      [gameBetween("g1", orcs, elves), gameBetween("g2", elves, dwarfs)],
      ["orcs"],
    );

    expect(calendar).toContain("SUMMARY:Elves @ Orcs");
    expect(calendar).not.toContain("SUMMARY:Dwarfs @ Elves");
  });

  it("with a blank team id does not let a game with an undecided team through", () => {
    const calendar = buildCalendar(
      [gameBetween("g1", null, orcs), gameBetween("g2", elves, null)],
      [""],
    );

    expect(calendar).not.toContain("SUMMARY:");
  });

  it("with several team ids keeps the games of each", () => {
    const calendar = buildCalendar(
      [gameBetween("g1", orcs, elves), gameBetween("g2", elves, dwarfs)],
      ["orcs", "dwarfs"],
    );

    expect(calendar).toContain("SUMMARY:Elves @ Orcs");
    expect(calendar).toContain("SUMMARY:Dwarfs @ Elves");
  });
});
