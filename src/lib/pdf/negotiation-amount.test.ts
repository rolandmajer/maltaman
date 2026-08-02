import { describe, it, expect } from "vitest";
import { negotiationAmount } from "@/lib/pdf/report-model";
import type { FullInspection } from "@/types/inspection";

/**
 * "Podklad na vyjednávanie" printed 0 € on a report carrying eighteen priced items, because it
 * counted only cost items linked to a defect — and linking is optional, so on that report none
 * were. The figure now matches the one the app's own "Podklady pre vyjednávanie" text is built
 * on: the technician's recommended discount, or the full estimate including VAT and reserve.
 */
const inspection = (over: Partial<FullInspection> = {}) =>
  ({ recommendedDiscountAmount: null, ...over }) as FullInspection;

describe("negotiationAmount", () => {
  it("uses the full estimate when the technician set no discount", () => {
    const result = negotiationAmount(inspection(), { finalTotalWithContingency: 4044.12 });
    expect(result).toEqual({ amount: 4044.12, derived: true });
  });

  it("does not depend on cost items being linked to a defect", () => {
    // The regression: eighteen priced items, none linked, no discount set.
    const result = negotiationAmount(inspection(), { finalTotalWithContingency: 33550 });
    expect(result.amount).toBe(33550);
    expect(result.amount).not.toBe(0);
  });

  it("prefers the technician's own recommended discount", () => {
    const result = negotiationAmount(inspection({ recommendedDiscountAmount: 3500 }), {
      finalTotalWithContingency: 4044.12,
    });
    expect(result).toEqual({ amount: 3500, derived: false });
  });

  it("falls back to the estimate when the discount is zero or negative", () => {
    expect(negotiationAmount(inspection({ recommendedDiscountAmount: 0 }), { finalTotalWithContingency: 900 })).toEqual({
      amount: 900,
      derived: true,
    });
    expect(negotiationAmount(inspection({ recommendedDiscountAmount: -5 }), { finalTotalWithContingency: 900 })).toEqual(
      { amount: 900, derived: true }
    );
  });

  it("reports zero when nothing has been priced, so the caller can say so instead of printing 0 €", () => {
    expect(negotiationAmount(inspection(), { finalTotalWithContingency: 0 })).toEqual({ amount: 0, derived: true });
  });
});
