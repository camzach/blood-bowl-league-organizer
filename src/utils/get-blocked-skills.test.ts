import { describe, it, expect } from "vitest";
import { getBlockedSkills } from "./get-blocked-skills";

// D requires A
// E requires F OR G
// H requires I
// B conflicts with C
const MOCK_RELATIONS = [
  { skillNameA: "B", skillNameB: "C", type: "conflicts" as const },
  { skillNameA: "D", skillNameB: "A", type: "requires" as const },
  { skillNameA: "E", skillNameB: "F", type: "requires" as const },
  { skillNameA: "E", skillNameB: "G", type: "requires" as const },
  { skillNameA: "H", skillNameB: "I", type: "requires" as const },
];

describe("getBlockedSkills", () => {
  it("should block skills the player already has", () => {
    const playerSkills = ["A"];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.get("A")).toEqual({ reason: "owned" });
  });

  it("should block conflicting skills", () => {
    const playerSkills = ["B"];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.get("C")).toEqual({
      reason: "conflict",
      conflictingSkill: "B",
    });
  });

  it("should not block non-conflicting skills", () => {
    const playerSkills = ["A"];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.has("B")).toBe(false);
  });

  it("should block skills with unmet requirements", () => {
    const playerSkills = ["B"]; // Does not have A
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.get("D")).toEqual({ reason: "requirement" }); // D requires A
  });

  it("should not block skills when requirements are met", () => {
    const playerSkills = ["A"];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.has("D")).toBe(false); // D requires A, player has A
  });

  it('should block skills with unmet "any of" requirements', () => {
    const playerSkills = ["A"]; // Does not have F or G
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.get("E")).toEqual({ reason: "requirement" }); // E requires F or G
  });

  it('should not block skills when one of "any of" requirements is met (first case)', () => {
    const playerSkills = ["F"];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.has("E")).toBe(false); // E requires F or G, player has F
  });

  it('should not block skills when one of "any of" requirements is met (second case)', () => {
    const playerSkills = ["G"];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.has("E")).toBe(false); // E requires F or G, player has G
  });

  it("should handle multiple requirements correctly", () => {
    const playerSkills = ["A", "I"];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.has("D")).toBe(false);
    expect(blocked.has("H")).toBe(false);
  });

  it("should block skills with unmet requirements regardless of player's unrelated skills", () => {
    const playerSkills = ["Z"]; // "Z" is not in any relations
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.size).toBe(4);
    expect(blocked.get("Z")).toEqual({ reason: "owned" });
    expect(blocked.get("D")).toEqual({ reason: "requirement" });
    expect(blocked.get("E")).toEqual({ reason: "requirement" });
    expect(blocked.get("H")).toEqual({ reason: "requirement" });
  });

  it("should work with an empty list of player skills", () => {
    const playerSkills: string[] = [];
    const blocked = getBlockedSkills(playerSkills, MOCK_RELATIONS);
    expect(blocked.get("D")).toEqual({ reason: "requirement" });
    expect(blocked.get("E")).toEqual({ reason: "requirement" });
    expect(blocked.get("H")).toEqual({ reason: "requirement" });
    expect(blocked.has("B")).toBe(false);
    expect(blocked.has("C")).toBe(false);
  });

  it("should work with an empty list of relations", () => {
    const playerSkills = ["A"];
    const blocked = getBlockedSkills(playerSkills, []);
    expect(blocked.size).toBe(1);
    expect(blocked.get("A")).toEqual({ reason: "owned" });
  });

  it("should prioritize conflict reason over requirement reason", () => {
    const playerSkills = ["B"]; // Has B
    const relationsWithOverlap = [
      ...MOCK_RELATIONS,
      // C requires Z (unmet), but also conflicts with B (which player has)
      { skillNameA: "Z", skillNameB: "C", type: "requires" as const },
    ];
    const blocked = getBlockedSkills(playerSkills, relationsWithOverlap);
    // The block reason should be 'conflict' because that's more specific and important.
    expect(blocked.get("C")).toEqual({
      reason: "conflict",
      conflictingSkill: "B",
    });
  });
});
