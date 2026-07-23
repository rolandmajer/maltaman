import { describe, it, expect } from "vitest";
import { computeStepCompletion } from "./step-completion";
import type { FullInspection } from "@/types/inspection";

function baseInspection(): FullInspection {
  return {
    inspectionDate: null,
    property: { address: "" },
    participants: [],
    rooms: [],
    categories: [],
    mainRisks: "",
    immediateActions: "",
    overallConditionRating: null,
    costItems: [],
    recommendations: [],
    photos: [],
    signatures: [],
    status: "DRAFT",
  } as unknown as FullInspection;
}

describe("computeStepCompletion", () => {
  it("marks every step incomplete for a freshly created inspection", () => {
    const completion = computeStepCompletion(baseInspection());
    expect(Object.values(completion).every((v) => v === false)).toBe(true);
  });

  it("marks zakladne-udaje complete once a date and address exist", () => {
    const inspection = baseInspection();
    inspection.inspectionDate = new Date();
    inspection.property = { address: "Hlavná 1" } as never;
    expect(computeStepCompletion(inspection)["zakladne-udaje"]).toBe(true);
  });

  it("marks miestnosti complete only when every room has at least one finding", () => {
    const inspection = baseInspection();
    inspection.rooms = [{ id: "r1", findings: [{ id: "f1" }] }] as never;
    expect(computeStepCompletion(inspection).miestnosti).toBe(true);

    inspection.rooms = [{ id: "r1", findings: [] }] as never;
    expect(computeStepCompletion(inspection).miestnosti).toBe(false);
  });

  it("marks vyhlasenie complete only when a signed technician signature exists", () => {
    const inspection = baseInspection();
    inspection.signatures = [{ role: "CLIENT", imageDataUrl: "data:..." }] as never;
    expect(computeStepCompletion(inspection).vyhlasenie).toBe(false);

    inspection.signatures = [{ role: "TECHNICIAN", imageDataUrl: "data:..." }] as never;
    expect(computeStepCompletion(inspection).vyhlasenie).toBe(true);
  });

  it("marks export complete only when the inspection status is COMPLETED", () => {
    const inspection = baseInspection();
    expect(computeStepCompletion(inspection).export).toBe(false);
    inspection.status = "COMPLETED";
    expect(computeStepCompletion(inspection).export).toBe(true);
  });
});
