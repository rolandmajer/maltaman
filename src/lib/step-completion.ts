import type { WizardStepKey } from "@/lib/constants";
import type { FullInspection } from "@/types/inspection";

export function computeStepCompletion(inspection: FullInspection): Record<WizardStepKey, boolean> {
  return {
    "zakladne-udaje": Boolean(inspection.inspectionDate && inspection.property?.address),
    ucastnici: inspection.participants.length > 0,
    miestnosti: inspection.rooms.length > 0 && inspection.rooms.every((r) => r.elements.length > 0),
    "technicky-stav": inspection.categories.some((c) => c.elements.some((e) => e.findings.length > 0)),
    zhrnutie: Boolean(inspection.mainRisks || inspection.immediateActions || inspection.overallConditionRating),
    naklady: inspection.costItems.length > 0,
    odporucania: inspection.recommendations.length > 0,
    foto: inspection.photos.length > 0,
    // Paid add-on: "done" means switched off (deliberately not sold) or switched on and populated.
    // Never left showing as outstanding work for a protocol that simply doesn't include it.
    vybavenost: !inspection.amenitiesEnabled || inspection.amenityPlaces.length > 0,
    vyhlasenie: inspection.signatures.some((s) => s.role === "TECHNICIAN" && s.imageDataUrl),
    export: inspection.status === "COMPLETED",
  };
}
