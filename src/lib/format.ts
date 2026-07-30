// Slovak locale formatting helpers (EUR currency, sk-SK dates/numbers).

const skLocale = "sk-SK";

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(skLocale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parses a number the way a Slovak user actually types it.
 *
 * The app prints amounts as "45,00 €", and on a Slovak keyboard the decimal key is a comma — so
 * "45,50" is the natural thing to enter. `Number("45,50")` is NaN, which the old `Number(v) || 0`
 * call sites silently turned into 0: a price typed with a comma vanished and the report showed
 * 0,00 €. Thousands separators (space or non-breaking space, as formatNumber emits) are stripped
 * for the same reason.
 *
 * Returns null for anything that still isn't a number, so callers can distinguish "blank" from
 * "zero" instead of collapsing both.
 */
export function parseDecimal(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s  ]/g, "") // ordinary, non-breaking and narrow no-break spaces
    .replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** parseDecimal with a fallback, for fields that store a plain number rather than a nullable one. */
export function parseDecimalOr(raw: string, fallback = 0): number {
  return parseDecimal(raw) ?? fallback;
}

export function formatNumber(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(skLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(skLocale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(skLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatArea(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${formatNumber(value)} m²`;
}

/** Generates the next protocol number for a year, e.g. "PZ-2026-014". */
export function nextProtocolNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
}
