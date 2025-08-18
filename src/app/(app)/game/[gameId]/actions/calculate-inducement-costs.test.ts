import { describe, expect, it } from "vitest";
import { calculateInducementCostsFromData } from "./calculate-inducement-costs";
import { inducement, specialRuleToStarPlayer, starPlayer } from "~/db/schema";

describe("calculate inducement costs", () => {
  const mockStarPlayersData = [
    {
      name: "star-player-1",
      hiringFee: 430000,
      partnerName: null,
      specialRuleToStarPlayer: [{ specialRuleName: "special-rule-1" }],
    },
    {
      name: "star-player-2",
      hiringFee: 320000,
      partnerName: null,
      specialRuleToStarPlayer: [{ specialRuleName: "special-rule-2" }],
    },
    {
      name: "star-player-3",
      hiringFee: 390000,
      partnerName: "star-player-4",
      specialRuleToStarPlayer: [{ specialRuleName: "special-rule-1" }],
    },
    {
      name: "star-player-4",
      hiringFee: 390000,
      partnerName: "star-player-3",
      specialRuleToStarPlayer: [{ specialRuleName: "special-rule-1" }],
    },
  ] as Array<
    typeof starPlayer.$inferSelect & {
      specialRuleToStarPlayer: Array<
        typeof specialRuleToStarPlayer.$inferSelect
      >;
    }
  >;

  const mockInducementsData = [
    {
      name: "inducement-1",
      max: 2,
      price: 50000,
      specialPrice: null,
      specialPriceRule: null,
    },
    {
      name: "inducement-2",
      max: 6,
      price: 10000,
      specialPrice: 5000,
      specialPriceRule: "special-rule-1",
    },
    {
      name: "inducement-3",
      max: 3,
      price: null,
      specialPrice: 50000,
      specialPriceRule: "special-rule-1",
    },
  ] as Array<typeof inducement.$inferSelect>;

  it("should calculate total cost correctly with no inducements or stars", () => {
    const result = calculateInducementCostsFromData(
      [],
      [],
      [],
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toBe(0);
  });

  it("should calculate cost for a single inducement", () => {
    const inducements = [{ name: "inducement-1", quantity: 1 }];
    const result = calculateInducementCostsFromData(
      inducements,
      [],
      [],
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toBe(50000);
  });

  it("should calculate cost for multiple inducements", () => {
    const inducements = [
      { name: "inducement-1", quantity: 1 },
      { name: "inducement-2", quantity: 2 },
    ];
    const result = calculateInducementCostsFromData(
      inducements,
      [],
      [],
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toBe(50000 + 2 * 10000);
  });

  it("should use special price rules for inducements", () => {
    const inducements = [{ name: "inducement-2", quantity: 1 }];
    const result = calculateInducementCostsFromData(
      inducements,
      [],
      ["special-rule-1"],
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toBe(5000);
  });

  it("should disallow purchase of inducements with null price", () => {
    const inducements = [{ name: "inducement-3", quantity: 1 }];
    expect(() =>
      calculateInducementCostsFromData(
        inducements,
        [],
        [],
        11,
        mockStarPlayersData,
        mockInducementsData,
      ),
    ).toThrow();
  });

  it("should allow puchase of null price with matching special rule", () => {
    const inducements = [{ name: "inducement-3", quantity: 1 }];
    const result = calculateInducementCostsFromData(
      inducements,
      [],
      ["special-rule-1"],
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toEqual(50000);
  });

  it("should calculate cost for a single star player", () => {
    const stars = ["star-player-1"];
    const specialRules = ["special-rule-1"];
    const result = calculateInducementCostsFromData(
      [],
      stars,
      specialRules,
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toBe(430000);
  });

  it("should calculate cost for multiple star players", () => {
    const stars = ["star-player-1", "star-player-2"];
    const specialRules = ["special-rule-1", "special-rule-2"];
    const result = calculateInducementCostsFromData(
      [],
      stars,
      specialRules,
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toBe(430000 + 320000);
  });

  it("should throw error if more than 2 star players are selected", () => {
    const stars = ["star-player-1", "star-player-2", "star-player-3"];
    expect(() =>
      calculateInducementCostsFromData(
        [],
        stars,
        [],
        11,
        mockStarPlayersData,
        mockInducementsData,
      ),
    ).toThrow("Only 2 star players permitted");
  });

  it("should throw error if total players + stars exceeds 16", () => {
    const stars = ["star-player-1"];
    expect(() =>
      calculateInducementCostsFromData(
        [],
        stars,
        [],
        16,
        mockStarPlayersData,
        mockInducementsData,
      ),
    ).toThrow("Star players take the team above 16 players");
  });

  it("should throw error for unknown inducement", () => {
    const inducements = [{ name: "Unknown Inducement", quantity: 1 }];
    expect(() =>
      calculateInducementCostsFromData(
        inducements,
        [],
        [],
        11,
        mockStarPlayersData,
        mockInducementsData,
      ),
    ).toThrow("Unknown inducement specified");
  });

  it("should throw error if inducement maximum exceeded", () => {
    const inducements = [{ name: "inducement-1", quantity: 3 }];
    expect(() =>
      calculateInducementCostsFromData(
        inducements,
        [],
        [],
        11,
        mockStarPlayersData,
        mockInducementsData,
      ),
    ).toThrow("Inducement maximum exceeded");
  });

  it("should throw error for invalid star player selection (missing special rule)", () => {
    const stars = ["star-player-1"];

    expect(() =>
      calculateInducementCostsFromData(
        [],
        stars,
        [],
        11,
        mockStarPlayersData,
        mockInducementsData,
      ),
    ).toThrow("Invalid Star Player selected");
  });

  it("should throw error if partner star player is not hired together", () => {
    const stars = ["star-player-3"];
    const specialRules = ["special-rule-1"];
    expect(() =>
      calculateInducementCostsFromData(
        [],
        stars,
        specialRules,
        11,
        mockStarPlayersData,
        mockInducementsData,
      ),
    ).toThrow("star-player-3 and star-player-4 must be hired together");
  });

  it("should calculate cost correctly with partner star players hired together", () => {
    const stars = ["star-player-3", "star-player-4"];
    const specialRules = ["special-rule-1"];
    const result = calculateInducementCostsFromData(
      [],
      stars,
      specialRules,
      11,
      mockStarPlayersData,
      mockInducementsData,
    );
    expect(result).toBe(390000 + 390000);
  });
});
