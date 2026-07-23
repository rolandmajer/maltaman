import { describe, it, expect } from "vitest";
import { computeCostItem, computeCostTotals, computeRoomArea, type CostItemForTotals } from "./calculations";

describe("computeCostItem", () => {
  it("computes excl/incl VAT from quantity and unit price", () => {
    const result = computeCostItem({
      quantity: 2,
      unitPrice: 50,
      laborCost: 0,
      materialCost: 0,
      otherCost: 0,
      vatRatePercent: 23,
    });
    expect(result.priceExclVat).toBe(100);
    expect(result.vatAmount).toBe(23);
    expect(result.priceInclVat).toBe(123);
  });

  it("sums quantity*unitPrice with labour/material/other cost breakdown", () => {
    const result = computeCostItem({
      quantity: 1,
      unitPrice: 0,
      laborCost: 40,
      materialCost: 60,
      otherCost: 10,
      vatRatePercent: 20,
    });
    expect(result.priceExclVat).toBe(110);
    expect(result.priceInclVat).toBe(132);
  });

  it("clamps negative inputs to zero", () => {
    const result = computeCostItem({
      quantity: -5,
      unitPrice: -10,
      laborCost: -1,
      materialCost: -1,
      otherCost: -1,
      vatRatePercent: -23,
    });
    expect(result.priceExclVat).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.priceInclVat).toBe(0);
  });

  it("defaults expected/min/max estimate from the computed price when not provided", () => {
    const result = computeCostItem({
      quantity: 1,
      unitPrice: 200,
      laborCost: 0,
      materialCost: 0,
      otherCost: 0,
      vatRatePercent: 0,
    });
    expect(result.expectedEstimate).toBe(200);
    expect(result.minEstimate).toBeCloseTo(170, 2);
    expect(result.maxEstimate).toBeCloseTo(230, 2);
  });

  it("respects explicitly provided min/expected/max estimates", () => {
    const result = computeCostItem({
      quantity: 1,
      unitPrice: 200,
      laborCost: 0,
      materialCost: 0,
      otherCost: 0,
      vatRatePercent: 0,
      minEstimate: 100,
      expectedEstimate: 180,
      maxEstimate: 260,
    });
    expect(result.minEstimate).toBe(100);
    expect(result.expectedEstimate).toBe(180);
    expect(result.maxEstimate).toBe(260);
  });
});

describe("computeCostTotals", () => {
  const items: CostItemForTotals[] = [
    {
      id: "1",
      categoryId: "cat-a",
      categoryName: "Kategória A",
      roomId: "room-1",
      roomName: "Kuchyňa",
      priority: "IMMEDIATE",
      included: true,
      priceExclVat: 100,
      vatAmount: 23,
      priceInclVat: 123,
      minEstimate: 100,
      expectedEstimate: 123,
      maxEstimate: 150,
    },
    {
      id: "2",
      categoryId: "cat-b",
      categoryName: "Kategória B",
      roomId: null,
      roomName: null,
      priority: "OPTIONAL",
      included: true,
      priceExclVat: 200,
      vatAmount: 46,
      priceInclVat: 246,
      minEstimate: 200,
      expectedEstimate: 246,
      maxEstimate: 300,
    },
    {
      id: "3",
      categoryId: "cat-a",
      categoryName: "Kategória A",
      roomId: "room-1",
      roomName: "Kuchyňa",
      priority: "IMMEDIATE",
      included: false, // excluded — must not affect totals
      priceExclVat: 9999,
      vatAmount: 9999,
      priceInclVat: 9999,
      minEstimate: 9999,
      expectedEstimate: 9999,
      maxEstimate: 9999,
    },
  ];

  it("sums only included items", () => {
    const totals = computeCostTotals(items, 0);
    expect(totals.totalExclVat).toBe(300);
    expect(totals.totalVat).toBe(69);
    expect(totals.totalInclVat).toBe(369);
  });

  it("groups subtotals by category and by room", () => {
    const totals = computeCostTotals(items, 0);
    expect(totals.byCategory.find((c) => c.categoryId === "cat-a")?.totalInclVat).toBe(123);
    expect(totals.byCategory.find((c) => c.categoryId === "cat-b")?.totalInclVat).toBe(246);
    expect(totals.byRoom.find((r) => r.roomId === "room-1")?.totalInclVat).toBe(123);
  });

  it("applies the contingency percentage on top of the VAT-inclusive total", () => {
    const totals = computeCostTotals(items, 10);
    expect(totals.contingencyAmount).toBeCloseTo(36.9, 2);
    expect(totals.finalTotalWithContingency).toBeCloseTo(405.9, 2);
  });

  it("computes min/expected/max scenario totals", () => {
    const totals = computeCostTotals(items, 0);
    expect(totals.totalMin).toBe(300);
    expect(totals.totalExpected).toBe(369);
    expect(totals.totalMax).toBe(450);
  });
});

describe("computeRoomArea", () => {
  it("prefers the manual override when present", () => {
    expect(computeRoomArea(3, 4, 15)).toBe(15);
  });

  it("falls back to length * width", () => {
    expect(computeRoomArea(3, 4, null)).toBe(12);
  });

  it("returns null when neither is available", () => {
    expect(computeRoomArea(null, null, null)).toBeNull();
  });
});
