// Pure calculation helpers for the cost-estimate module.
// Kept framework-free and side-effect-free so they are trivial to unit test.

export type CostItemInput = {
  quantity: number;
  unitPrice: number;
  laborCost: number;
  materialCost: number;
  otherCost: number;
  vatRatePercent: number;
  minEstimate?: number | null;
  expectedEstimate?: number | null;
  maxEstimate?: number | null;
};

export type CostItemComputed = {
  priceExclVat: number;
  vatAmount: number;
  priceInclVat: number;
  minEstimate: number;
  expectedEstimate: number;
  maxEstimate: number;
};

/**
 * Rounds money to cents, half away from zero.
 *
 * The previous `Math.round((n + Number.EPSILON) * 100) / 100` did not work: Number.EPSILON is
 * 2.2e-16, but the gap between representable doubles near 193 is ~4.3e-14 — roughly 200× larger —
 * so adding it changed nothing. `167.9 * 1.15` is 193.08499999999998 in binary floating point and
 * rounded down to 193.08 instead of 193.09, leaving the report a cent short.
 *
 * Scaling and trimming to 6 decimals first discards the binary representation error, so the value
 * on the .005 boundary rounds the way a person reading the figures expects.
 */
const round2 = (n: number) => {
  const scaled = Number((n * 100).toFixed(6));
  return (scaled < 0 ? -Math.round(-scaled) : Math.round(scaled)) / 100;
};

/** Row-level totals for a single cost item. Negative inputs are clamped to 0. */
/**
 * @param enteredInclVat When true the technician typed gross amounts (a contractor quote given
 *   "s DPH"), so the net price and VAT are derived back out of the entered total instead of VAT
 *   being added on top. Defaults to false — the historical behaviour.
 */
export function computeCostItem(input: CostItemInput, enteredInclVat = false): CostItemComputed {
  const quantity = Math.max(0, input.quantity || 0);
  const unitPrice = Math.max(0, input.unitPrice || 0);
  const laborCost = Math.max(0, input.laborCost || 0);
  const materialCost = Math.max(0, input.materialCost || 0);
  const otherCost = Math.max(0, input.otherCost || 0);
  const vatRatePercent = Math.max(0, input.vatRatePercent || 0);

  const entered = quantity * unitPrice + laborCost + materialCost + otherCost;

  let priceExclVat: number;
  let priceInclVat: number;
  if (enteredInclVat) {
    priceInclVat = round2(entered);
    priceExclVat = round2(entered / (1 + vatRatePercent / 100));
  } else {
    priceExclVat = round2(entered);
    priceInclVat = round2(priceExclVat * (1 + vatRatePercent / 100));
  }
  // Derived from the two rounded endpoints so net + VAT always equals the gross shown, rather
  // than drifting a cent from independent rounding.
  const vatAmount = round2(priceInclVat - priceExclVat);

  const expectedEstimate = round2(
    input.expectedEstimate != null && input.expectedEstimate > 0 ? input.expectedEstimate : priceInclVat
  );
  const minEstimate = round2(
    input.minEstimate != null && input.minEstimate >= 0 ? input.minEstimate : expectedEstimate * 0.85
  );
  const maxEstimate = round2(
    input.maxEstimate != null && input.maxEstimate >= 0 ? input.maxEstimate : expectedEstimate * 1.15
  );

  return { priceExclVat, vatAmount, priceInclVat, minEstimate, expectedEstimate, maxEstimate };
}

export type CostItemForTotals = CostItemComputed & {
  id: string;
  categoryId: string;
  categoryName: string;
  roomId?: string | null;
  roomName?: string | null;
  priority: string;
  included: boolean;
};

export type CostTotals = {
  totalExclVat: number;
  totalVat: number;
  totalInclVat: number;
  totalMin: number;
  totalExpected: number;
  totalMax: number;
  contingencyAmount: number;
  finalTotalWithContingency: number;
  byCategory: { categoryId: string; categoryName: string; totalInclVat: number }[];
  byRoom: { roomId: string; roomName: string; totalInclVat: number }[];
  byPriority: { priority: string; totalInclVat: number }[];
};

/** Aggregate totals across a set of cost items. Items with `included: false` are excluded. */
export function computeCostTotals(items: CostItemForTotals[], contingencyPercent: number): CostTotals {
  const active = items.filter((i) => i.included);

  const sum = (fn: (i: CostItemForTotals) => number) => round2(active.reduce((acc, i) => acc + fn(i), 0));

  const totalExclVat = sum((i) => i.priceExclVat);
  const totalVat = sum((i) => i.vatAmount);
  const totalInclVat = sum((i) => i.priceInclVat);
  const totalMin = sum((i) => i.minEstimate);
  const totalExpected = sum((i) => i.expectedEstimate);
  const totalMax = sum((i) => i.maxEstimate);

  const contingencyAmount = round2(totalInclVat * (Math.max(0, contingencyPercent) / 100));
  const finalTotalWithContingency = round2(totalInclVat + contingencyAmount);

  const byCategoryMap = new Map<string, { categoryName: string; total: number }>();
  const byRoomMap = new Map<string, { roomName: string; total: number }>();
  const byPriorityMap = new Map<string, number>();

  for (const item of active) {
    const cat = byCategoryMap.get(item.categoryId) ?? { categoryName: item.categoryName, total: 0 };
    cat.total += item.priceInclVat;
    byCategoryMap.set(item.categoryId, cat);

    if (item.roomId) {
      const room = byRoomMap.get(item.roomId) ?? { roomName: item.roomName ?? "", total: 0 };
      room.total += item.priceInclVat;
      byRoomMap.set(item.roomId, room);
    }

    byPriorityMap.set(item.priority, (byPriorityMap.get(item.priority) ?? 0) + item.priceInclVat);
  }

  return {
    totalExclVat,
    totalVat,
    totalInclVat,
    totalMin,
    totalExpected,
    totalMax,
    contingencyAmount,
    finalTotalWithContingency,
    byCategory: [...byCategoryMap.entries()].map(([categoryId, v]) => ({
      categoryId,
      categoryName: v.categoryName,
      totalInclVat: round2(v.total),
    })),
    byRoom: [...byRoomMap.entries()].map(([roomId, v]) => ({
      roomId,
      roomName: v.roomName,
      totalInclVat: round2(v.total),
    })),
    byPriority: [...byPriorityMap.entries()].map(([priority, total]) => ({
      priority,
      totalInclVat: round2(total),
    })),
  };
}

export function computeRoomArea(lengthM?: number | null, widthM?: number | null, areaOverrideM2?: number | null) {
  if (areaOverrideM2 != null && areaOverrideM2 > 0) return round2(areaOverrideM2);
  if (lengthM != null && widthM != null && lengthM > 0 && widthM > 0) return round2(lengthM * widthM);
  return null;
}
