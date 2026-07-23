import type { WizardStepKey } from "@/lib/constants";
import type { FullInspection } from "@/types/inspection";

export function computeStepCompletion(inspection: FullInspection): Record<WizardStepKey, boolean> {
  return {
    "zakladne-udaje": Boolean(inspection.inspectionDate && inspection.property?.address),
    ucastnici: inspection.participants.length > 0,
    miestnosti: inspection.rooms.length > 0 && inspection.rooms.every((r) => r.findings.length > 0),
    "technicky-stav": inspection.categories.some((c) => c.elements.some((e) => e.findings.length > 0)),
    zhrnutie: Boolean(inspection.mainRisks || inspection.immediateActions || inspection.overallConditionRating),
    naklady: inspection.costItems.length > 0,
    odporucania: inspection.recommendations.length > 0,
    foto: inspection.photos.length > 0,
    vyhlasenie: inspection.signatures.some((s) => s.role === "TECHNICIAN" && s.imageDataUrl),
    export: inspection.status === "COMPLETED",
  };
}
