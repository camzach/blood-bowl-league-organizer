import { describe, expect, it } from "vitest";
import { sppCostTable } from "~/app/utils/advancement";

describe("sppCostTable", () => {
  it("has 6 costs per category", () => {
    Object.values(sppCostTable).forEach((costs) =>
      expect(costs).toHaveLength(6),
    );
  });

  it("has monotonically increasing costs", () => {
    Object.values(sppCostTable).forEach((costs) => {
      for (let i = 0; i < costs.length - 1; i++) {
        expect(costs[i]).toBeLessThan(costs[i + 1]);
      }
    });
  });

  it("increases in price across categories", () => {
    for (let i = 0; i < 6; i++) {
      expect(sppCostTable.random_primary[i]).toBeLessThan(
        sppCostTable.chosen_primary[i],
      );
      expect(sppCostTable.chosen_primary[i]).toBeLessThan(
        sppCostTable.chosen_secondary[i],
      );
      expect(sppCostTable.chosen_secondary[i]).toBeLessThan(
        sppCostTable.characteristic[i],
      );
    }
  });
});
