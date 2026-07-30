import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatNumber, nextProtocolNumber, parseDecimal, parseDecimalOr } from "./format";

describe("parseDecimal", () => {
  it("reads the Slovak decimal comma the app itself prints", () => {
    // "45,50" used to become NaN and then 0, so a price typed with a comma silently vanished.
    expect(parseDecimal("45,50")).toBe(45.5);
  });

  it("still reads a decimal point", () => {
    expect(parseDecimal("45.50")).toBe(45.5);
  });

  it("ignores thousands separators, including the non-breaking space formatNumber emits", () => {
    expect(parseDecimal("1 200")).toBe(1200);
    expect(parseDecimal("1 200,50")).toBe(1200.5);
    expect(parseDecimal("1 200")).toBe(1200);
  });

  it("returns null for blank so callers can tell it apart from zero", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
  });

  it("returns null rather than a silent zero for nonsense", () => {
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("-")).toBeNull();
  });

  it("keeps zero and negatives distinct from blank", () => {
    expect(parseDecimal("0")).toBe(0);
    expect(parseDecimal("-12,5")).toBe(-12.5);
  });

  it("round-trips what formatNumber produces", () => {
    expect(parseDecimal(formatNumber(1234.56))).toBe(1234.56);
  });
});

describe("parseDecimalOr", () => {
  it("falls back for blank and nonsense", () => {
    expect(parseDecimalOr("")).toBe(0);
    expect(parseDecimalOr("abc")).toBe(0);
    expect(parseDecimalOr("", 1)).toBe(1);
  });

  it("passes real numbers through, comma included", () => {
    expect(parseDecimalOr("45,50")).toBe(45.5);
  });
});

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
