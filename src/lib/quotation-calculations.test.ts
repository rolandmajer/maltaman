import { describe, expect, it } from "vitest";
import { baseInspectionPrice, complexityPercentFor, optionalServicePrice, quotationTotals, travelPrice } from "./quotation-calculations";

const travel = { freeUpToKm: 30, bandTwoUpToKm: 60, bandTwoPrice: 20, bandThreeUpToKm: 100, bandThreePrice: 40, overBandRatePerKm: 0.4 };

describe("quotation calculations", () => {
  it("applies the minimum and then the per-square-metre price", () => {
    expect(baseInspectionPrice(55, 2.5, 180)).toBe(180);
    expect(baseInspectionPrice(90, 2.5, 180)).toBe(225);
  });

  it("uses the full return journey for every travel band", () => {
    expect(travelPrice(30, travel)).toBe(0);
    expect(travelPrice(44, travel)).toBe(20);
    expect(travelPrice(80, travel)).toBe(40);
    expect(travelPrice(140, travel)).toBe(56);
  });

  it("caps percentage complexity at forty percent", () => {
    expect(complexityPercentFor(["HEAVILY_FURNISHED", "MULTI_FLOOR"])).toBe(20);
    expect(complexityPercentFor(["FURNITURE_MOVEMENT", "MULTI_FLOOR", "HISTORIC", "DETERIORATED"])).toBe(40);
  });

  it("prices the full protocol per square metre with a minimum", () => {
    const service = { code: "FULL_PROTOCOL", name: "Protokol", description: "", pricingMode: "PER_M2" as const, price: 1.2, minimumPrice: 120 };
    expect(optionalServicePrice(service, 90)).toBe(120);
    expect(optionalServicePrice(service, 160)).toBe(192);
  });

  it("excludes unselected options and derives VAT from gross prices", () => {
    const totals = quotationTotals([
      { selected: true, quantity: 1, unitPrice: 225 },
      { selected: false, quantity: 1, unitPrice: 75 },
      { selected: true, quantity: 1, unitPrice: 40 },
    ], 0, 23, true);
    expect(totals.subtotalEntered).toBe(265);
    expect(totals.priceInclVat).toBe(265);
    expect(totals.priceExclVat).toBe(215.45);
    expect(totals.vatAmount).toBe(49.55);
  });
});
