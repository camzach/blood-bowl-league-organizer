import { afterEach, describe, expect, it, vi } from "vitest";
import { getExpensiveMistakeCost } from "~/app/utils/expensive-mistakes";
import { d6 } from "~/app/utils/d6";

vi.mock("~/app/utils/d6", () => ({ d6: vi.fn() }));

describe("getExpensiveMistakeCost", () => {
  afterEach(() => {
    vi.mocked(d6).mockReset();
  });

  it("loses nothing when the crisis is averted", () => {
    expect(getExpensiveMistakeCost("Crisis Averted", 300_000)).toBe(0);
  });

  it.each([
    [1, 10_000],
    [2, 10_000],
    [3, 20_000],
    [4, 20_000],
    [5, 30_000],
    [6, 30_000],
  ])("a minor incident on a d6 of %i loses D3 x 10000, %i", (roll, cost) => {
    vi.mocked(d6).mockReturnValue(roll);
    expect(getExpensiveMistakeCost("Minor Incident", 300_000)).toBe(cost);
  });

  it.each([
    [300_000, 150_000],
    [310_000, 155_000],
    [315_000, 155_000],
    [349_000, 170_000],
  ])(
    "a major incident on %i loses half rounded down to 5000, %i",
    (treasury, cost) => {
      expect(getExpensiveMistakeCost("Major Incident", treasury)).toBe(cost);
    },
  );

  it.each([
    [1, 1, 580_000],
    [3, 4, 530_000],
    [6, 6, 480_000],
  ])(
    "a catastrophe on 2D6 of %i and %i leaves 2D6 x 10000 and takes the rest from 600000",
    (first, second, cost) => {
      vi.mocked(d6).mockReturnValueOnce(first).mockReturnValueOnce(second);
      expect(getExpensiveMistakeCost("Catastrophe", 600_000)).toBe(cost);
    },
  );
});
