import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatNumber, nextProtocolNumber } from "./format";

describe("formatCurrency", () => {
  it("formats numbers as EUR using Slovak locale grouping/decimal marks", () => {
    // sk-SK uses a non-breaking space as thousands separator and a comma as decimal mark.
    expect(formatCurrency(3676.47).replace(/ /g, " ")).toBe("3 676,47 €");
  });

  it("returns an em dash for missing values", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("uses a comma as the decimal separator", () => {
    expect(formatNumber(82.5)).toBe("82,5");
  });
});

describe("formatDate", () => {
  it("formats dates as dd.mm.yyyy", () => {
    expect(formatDate(new Date("2026-07-18T00:00:00Z"))).toMatch(/^\d{2}\. \d{2}\. \d{4}$/);
  });

  it("returns an em dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("nextProtocolNumber", () => {
  it("formats a zero-padded sequential protocol number", () => {
    expect(nextProtocolNumber("PZ", 2026, 3)).toBe("PZ-2026-003");
    expect(nextProtocolNumber("PZ", 2026, 42)).toBe("PZ-2026-042");
  });
});
