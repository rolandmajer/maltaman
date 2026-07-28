// Runs the Slovak typographic clean-up across the inspection's text when a protocol is completed.
// See slovak-typography.ts for what it does and what it deliberately leaves alone.
//
// Fields are split into two groups. PROSE fields are sentences the technician wrote, and get the
// full treatment (sentence case + closing period). LABEL fields are names, addresses and picked
// dropdown values — they only get the mechanical fixes, because "Hlavná 22." is not an address
// and "Pri okne." is not a location.

import { db } from "@/lib/db";
import { normalizeFields } from "@/lib/slovak-typography";

const PROSE = {
  inspection: ["generalNote", "mainRisks", "immediateActions", "followUpInspections", "verdictJustification"],
  conditions: ["accessibility", "limitations", "equipmentCondition", "notes"],
  room: ["accessibility", "notes"],
  roomElement: ["description", "naReasonNote"],
  elementCondition: ["cause", "recommendedAction", "note"],
  finding: ["description", "recommendedAction"],
  recommendation: ["text"],
  costItem: ["description"],
  participant: ["note"],
} as const;

const LABEL = {
  property: ["address", "municipality", "district", "cadastralArea", "ownerName", "ownerContact", "administratorName", "occupancyStatus"],
  conditions: ["weather", "occupancy", "lighting", "measuringDevices"],
  room: ["name", "generalCondition"],
  roomElement: ["label"],
  elementCondition: ["location", "extent"],
  finding: ["label", "location", "recommendedSpecialist"],
  costItem: ["name"],
  participant: ["fullName", "organisation", "role"],
} as const;

/**
 * Normalises the inspection's text in place. Returns how many rows changed, so the caller can
 * tell the technician what happened rather than silently rewriting their work.
 */
export async function normalizeInspectionText(inspectionId: string): Promise<number> {
  const inspection = await db.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      property: true,
      conditions: true,
      participants: true,
      rooms: { include: { elements: { include: { conditions: true } } } },
      findings: true,
      recommendations: true,
      costItems: true,
    },
  });
  if (!inspection) return 0;

  const updates: Promise<unknown>[] = [];
  let changed = 0;

  /** Merges the prose-mode and label-mode patches for one row and queues the update. */
  const apply = <T extends Record<string, unknown>>(
    row: T | null | undefined,
    prose: readonly (keyof T & string)[],
    label: readonly (keyof T & string)[],
    run: (patch: Record<string, string>) => Promise<unknown>
  ) => {
    if (!row) return;
    const patch = { ...normalizeFields(row, prose, "prose"), ...normalizeFields(row, label, "label") };
    if (Object.keys(patch).length === 0) return;
    changed++;
    updates.push(run(patch as Record<string, string>));
  };

  apply(inspection, PROSE.inspection, [], (p) => db.inspection.update({ where: { id: inspection.id }, data: p }));
  apply(inspection.property, [], LABEL.property, (p) =>
    db.property.update({ where: { id: inspection.property!.id }, data: p })
  );
  apply(inspection.conditions, PROSE.conditions, LABEL.conditions, (p) =>
    db.inspectionConditions.update({ where: { id: inspection.conditions!.id }, data: p })
  );

  for (const participant of inspection.participants) {
    apply(participant, PROSE.participant, LABEL.participant, (p) =>
      db.participant.update({ where: { id: participant.id }, data: p })
    );
  }

  for (const room of inspection.rooms) {
    apply(room, PROSE.room, LABEL.room, (p) => db.room.update({ where: { id: room.id }, data: p }));
    for (const element of room.elements) {
      apply(element, PROSE.roomElement, LABEL.roomElement, (p) =>
        db.roomElement.update({ where: { id: element.id }, data: p })
      );
      for (const condition of element.conditions) {
        apply(condition, PROSE.elementCondition, LABEL.elementCondition, (p) =>
          db.elementCondition.update({ where: { id: condition.id }, data: p })
        );
      }
    }
  }

  for (const finding of inspection.findings) {
    apply(finding, PROSE.finding, LABEL.finding, (p) => db.finding.update({ where: { id: finding.id }, data: p }));
  }
  for (const rec of inspection.recommendations) {
    apply(rec, PROSE.recommendation, [], (p) => db.recommendation.update({ where: { id: rec.id }, data: p }));
  }
  for (const item of inspection.costItems) {
    apply(item, PROSE.costItem, LABEL.costItem, (p) => db.costItem.update({ where: { id: item.id }, data: p }));
  }

  await Promise.all(updates);
  return changed;
}
