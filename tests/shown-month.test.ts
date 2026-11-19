import { describe, expect, test } from "vitest";
import { shownMonth } from "~/app/utils/shown-month";

describe("shownMonth", () => {
  test.each([
    [
      "no params uses today's month",
      new Date(2031, 0, 31),
      undefined,
      undefined,
      2031,
      0,
    ],
    ["the 31st into a 28-day month", new Date(2031, 0, 31), 2030, 1, 2030, 1],
    ["the 31st into a 30-day month", new Date(2031, 6, 31), 2031, 5, 2031, 5],
    ["the 30th into February", new Date(2031, 3, 30), 2031, 1, 2031, 1],
    ["leap day into a shorter month", new Date(2028, 1, 29), 2029, 1, 2029, 1],
    [
      "only a year keeps today's month",
      new Date(2031, 2, 31),
      2030,
      undefined,
      2030,
      2,
    ],
    [
      "only a month keeps today's year",
      new Date(2031, 2, 31),
      undefined,
      1,
      2031,
      1,
    ],
    ["December", new Date(2031, 0, 15), 2030, 11, 2030, 11],
  ])("%s", (_, today, year, month, expectedYear, expectedMonth) => {
    const shown = shownMonth(today, year, month);

    expect(shown.getFullYear()).toBe(expectedYear);
    expect(shown.getMonth()).toBe(expectedMonth);
    expect(shown.getDate()).toBe(1);
  });
});
