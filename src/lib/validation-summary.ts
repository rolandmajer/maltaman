import type { INSPECTION_FULL_INCLUDE } from "@/lib/inspection-service";
import type { Prisma } from "@/generated/prisma/client";

type FullInspection = Prisma.InspectionGetPayload<{ include: typeof INSPECTION_FULL_INCLUDE }>;

export type ValidationIssue = { code: string; message: string; step: string };

export type ValidationSummary = {
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
  canComplete: boolean;
};

/**
 * Checks completeness before finalisation. Only a small set of issues block completion
 * (protocol identity + at least one signature); everything else is a non-blocking warning
 * so technicians can always save a draft, per the "warnings never block draft saving" rule.
 */
export function computeValidationSummary(inspection: FullInspection): ValidationSummary {
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!inspection.inspectionDate) {
    blockers.push({ code: "missing-date", message: "Chýba dátum obhliadky", step: "zakladne-udaje" });
  }
  if (!inspection.property?.address) {
    blockers.push({ code: "missing-address", message: "Chýba adresa nehnuteľnosti", step: "zakladne-udaje" });
  }
  const hasTechnicianSignature = inspection.signatures.some(
    (s) => s.role === "TECHNICIAN" && s.imageDataUrl
  );
  if (!hasTechnicianSignature) {
    blockers.push({ code: "missing-signature", message: "Chýba podpis poradcu", step: "vyhlasenie" });
  }

  if (inspection.participants.length === 0) {
    warnings.push({ code: "no-participants", message: "Neboli zadaní žiadni účastníci obhliadky", step: "ucastnici" });
  }
  if (inspection.rooms.length === 0) {
    warnings.push({ code: "no-rooms", message: "Nebola pridaná žiadna miestnosť", step: "miestnosti" });
  }

  for (const room of inspection.rooms) {
    if (room.elements.length === 0) {
      warnings.push({
        code: `room-${room.id}-checklist`,
        message: `Miestnosť „${room.name}“ nemá vyplnený kontrolný zoznam`,
        step: "miestnosti",
      });
    }
    // Per the room-element spec: OK doesn't require a written note if structured attribute
    // selections are sufficient, but V/R must have at least one recorded ElementCondition.
    const badElementsMissingCondition = room.elements.filter(
      (e) => (e.status === "V" || e.status === "R") && e.conditions.length === 0
    );
    if (badElementsMissingCondition.length > 0) {
      warnings.push({
        code: `room-${room.id}-desc`,
        message: `Miestnosť „${room.name}“ má prvky bez zaznamenaného stavu alebo zistenia`,
        step: "miestnosti",
      });
    }
  }

  const costItemsWithoutPrice = inspection.costItems.filter(
    (i) => i.included && i.unitPrice === 0 && i.laborCost === 0 && i.materialCost === 0 && i.otherCost === 0
  );
  if (costItemsWithoutPrice.length > 0) {
    warnings.push({
      code: "cost-items-no-price",
      message: `${costItemsWithoutPrice.length}× položka odhadu nákladov bez ceny`,
      step: "naklady",
    });
  }

  const photosWithoutCaption = inspection.photos.filter((p) => !p.caption.trim() && !p.excludeFromReport);
  if (photosWithoutCaption.length > 0) {
    warnings.push({
      code: "photos-no-caption",
      message: `${photosWithoutCaption.length}× fotografia bez popisu`,
      step: "foto",
    });
  }

  if (inspection.photos.length === 0) {
    warnings.push({ code: "no-photos", message: "Nebola pridaná žiadna fotografia", step: "foto" });
  }

  if (!inspection.overallVerdict) {
    warnings.push({ code: "no-verdict", message: "Nebolo zvolené odporúčanie poradcu", step: "odporucania" });
  }

  if (inspection.recommendations.length === 0) {
    warnings.push({ code: "no-recommendations", message: "Neboli pridané žiadne odporúčania", step: "odporucania" });
  }

  return { blockers, warnings, canComplete: blockers.length === 0 };
}
