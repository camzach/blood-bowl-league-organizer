import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateFanUpdate, resultOf } from "~/app/routes/game/fans";
import { d6 } from "~/app/utils/d6";

vi.mock("~/app/utils/d6", () => ({ d6: vi.fn() }));

describe("resultOf", () => {
  it("is won when my score is higher", () => {
    expect(resultOf(3, 1)).toBe("won");
  });

  it("is lost when the other score is higher", () => {
    expect(resultOf(1, 3)).toBe("lost");
  });

  it("is tied when scores are equal", () => {
    expect(resultOf(2, 2)).toBe("tied");
    expect(resultOf(0, 0)).toBe("tied");
  });
});

describe("calculateFanUpdate", () => {
  beforeEach(() => {
    vi.mocked(d6).mockReset();
  });

  it("gains a fan on a win when the roll beats the current fans", () => {
    vi.mocked(d6).mockReturnValue(4);
    expect(calculateFanUpdate("won", 3)).toEqual({
      roll: 4,
      currentFans: 3,
      newFans: 4,
      change: 1,
    });
  });

  it("keeps the fans on a win when the roll equals or is below them", () => {
    vi.mocked(d6).mockReturnValue(3);
    expect(calculateFanUpdate("won", 3).change).toBe(0);
    vi.mocked(d6).mockReturnValue(1);
    expect(calculateFanUpdate("won", 3).change).toBe(0);
  });

  it("loses a fan on a loss when the roll is below the current fans", () => {
    vi.mocked(d6).mockReturnValue(2);
    expect(calculateFanUpdate("lost", 5)).toEqual({
      roll: 2,
      currentFans: 5,
      newFans: 4,
      change: -1,
    });
  });

  it("keeps the fans on a loss when the roll equals or beats them", () => {
    vi.mocked(d6).mockReturnValue(5);
    expect(calculateFanUpdate("lost", 5).newFans).toBe(5);
    vi.mocked(d6).mockReturnValue(6);
    expect(calculateFanUpdate("lost", 5).newFans).toBe(5);
  });

  it("never changes the fans on a tie", () => {
    vi.mocked(d6).mockReturnValue(6);
    expect(calculateFanUpdate("tied", 3).newFans).toBe(3);
    vi.mocked(d6).mockReturnValue(1);
    expect(calculateFanUpdate("tied", 3).newFans).toBe(3);
  });

  it("cannot lose the last fan, because no roll is below 1", () => {
    vi.mocked(d6).mockReturnValue(1);
    expect(calculateFanUpdate("lost", 1).newFans).toBe(1);
  });
});
