import { computeRoomArea } from "@/lib/calculations";
import { parseJsonStringArray } from "@/lib/element-description";
import type { FullInspection } from "@/types/inspection";

/**
 * Everything the report needs that is *derived* rather than stored — element tallies, the defect
 * pool, the negotiation figure. Kept out of the document component so the numbers printed on the
 * cover and in the summary can be unit-tested without rendering a PDF.
 */

export type StatusTally = { ok: number; v: number; r: number; n: number; na: number };

const emptyTally = (): StatusTally => ({ ok: 0, v: 0, r: 0, n: 0, na: 0 });

function add(tally: StatusTally, status: string) {
  if (status === "OK") tally.ok++;
  else if (status === "V") tally.v++;
  else if (status === "R") tally.r++;
  else if (status === "NEVZTAHUJE_SA") tally.na++;
  else tally.n++;
}

/** Per-room element tally. "Nevzťahuje sa" is counted separately — it is not an assessment. */
export function roomTally(room: FullInspection["rooms"][number]): StatusTally {
  const tally = emptyTally();
  for (const element of room.elements) add(tally, element.status);
  return tally;
}

/** Tally across every room element plus every Technický stav finding. */
export function overallTally(inspection: FullInspection): StatusTally {
  const tally = emptyTally();
  for (const room of inspection.rooms) for (const element of room.elements) add(tally, element.status);
  for (const finding of inspection.findings) add(tally, finding.status);
  return tally;
}

/** Elements that carry an assessment — the denominator behind "z N posudzovaných prvkov". */
export function assessedCount(tally: StatusTally) {
  return tally.ok + tally.v + tally.r + tally.n;
}

export type DefectRow = {
  id: string;
  status: string;
  severity: string | null;
  label: string;
  description: string;
  source: string;
};

/**
 * The single defect pool behind both the summary table and the headline counts: Technický stav
 * findings and room-element conditions, which are two different models but one list to the reader.
 */
export function collectDefects(inspection: FullInspection): DefectRow[] {
  const fromTechnical: DefectRow[] = inspection.findings
    .filter((f) => (f.status === "V" || f.status === "R") && f.includeInSummary)
    .map((f) => ({
      id: f.id,
      status: f.status,
      severity: f.severity,
      label: f.label,
      description: [parseJsonStringArray(f.defectTypes).join(", "), f.description].filter(Boolean).join(" — "),
      source: "Technický stav",
    }));

  const roomNameById = new Map(inspection.rooms.map((r) => [r.id, r.name]));
  const fromRooms: DefectRow[] = inspection.rooms.flatMap((room) =>
    room.elements
      .filter((element) => element.status === "V" || element.status === "R")
      .flatMap((element) =>
        element.conditions
          .filter((c) => c.includeInSummary && !c.excludeFromReport)
          .map((c) => ({
            id: c.id,
            status: element.status,
            severity: c.severity,
            label: element.label,
            description:
              [parseJsonStringArray(c.defectTypes).join(", "), c.location, c.extent, c.note]
                .filter(Boolean)
                .join(" — ") || element.description,
            source: roomNameById.get(room.id) ?? "Miestnosť",
          }))
      )
  );

  return [...fromTechnical, ...fromRooms];
}

/** Total floor area: the recorded property figure, else the sum of the measured rooms. */
export function totalFloorArea(inspection: FullInspection): number | null {
  if (inspection.property?.totalFloorAreaM2) return inspection.property.totalFloorAreaM2;
  const sum = inspection.rooms.reduce(
    (acc, r) => acc + (computeRoomArea(r.lengthM, r.widthM, r.areaOverrideM2) ?? 0),
    0
  );
  return sum > 0 ? Math.round(sum * 100) / 100 : null;
}

/**
 * The figure the client takes into a price negotiation: the technician's own recommended discount
 * when they set one, otherwise the full estimate including VAT and the reserve.
 *
 * That total is the same number the app's own "Podklady pre vyjednávanie" text is built on, so the
 * headline and the narrative agree. An earlier version counted only cost items linked to a defect,
 * on the theory that the rest is work the seller is not answerable for — but linking an item to a
 * defect is optional and most are entered straight into a category, so that version printed a
 * confident 0 € on a report carrying eighteen priced items.
 */
export function negotiationAmount(
  inspection: FullInspection,
  totals: { finalTotalWithContingency: number }
): { amount: number; derived: boolean } {
  if (inspection.recommendedDiscountAmount != null && inspection.recommendedDiscountAmount > 0) {
    return { amount: inspection.recommendedDiscountAmount, derived: false };
  }
  return { amount: totals.finalTotalWithContingency, derived: true };
}

/** Splits a list into two balanced columns, since react-pdf has no `column-count`. */
export function splitColumns<T>(items: T[], weight: (item: T) => number = () => 1): [T[], T[]] {
  const total = items.reduce((acc, item) => acc + weight(item), 0);
  const left: T[] = [];
  const right: T[] = [];
  let used = 0;
  for (const item of items) {
    const w = weight(item);
    // Place in the left column while doing so keeps it at or under half the total weight; the
    // midpoint test uses the block's own centre so a single tall block does not overshoot.
    if (used + w / 2 <= total / 2) {
      left.push(item);
      used += w;
    } else {
      right.push(item);
    }
  }
  return [left, right];
}
