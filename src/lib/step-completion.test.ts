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
    amenitiesEnabled: false,
    amenityPlaces: [],
    status: "DRAFT",
  } as unknown as FullInspection;
}

describe("computeStepCompletion", () => {
  it("marks every step incomplete for a freshly created inspection", () => {
    const completion = computeStepCompletion(baseInspection());
    // vybavenost is the one exception: it is a paid add-on, so while it is switched off there is
    // no outstanding work to flag. See the amenities cases below.
    const { vybavenost, ...rest } = completion;
    expect(vybavenost).toBe(true);
    expect(Object.values(rest).every((v) => v === false)).toBe(true);
  });

  it("counts vybavenost as done while the add-on is switched off", () => {
    expect(computeStepCompletion(baseInspection()).vybavenost).toBe(true);
  });

  it("marks vybavenost outstanding once the add-on is switched on but still empty", () => {
    const inspection = baseInspection();
    inspection.amenitiesEnabled = true;
    expect(computeStepCompletion(inspection).vybavenost).toBe(false);
  });

  it("marks vybavenost complete once places have been found", () => {
    const inspection = baseInspection();
    inspection.amenitiesEnabled = true;
    inspection.amenityPlaces = [{ id: "a" }] as never;
    expect(computeStepCompletion(inspection).vybavenost).toBe(true);
  });

  it("marks zakladne-udaje complete once a date and address exist", () => {
    const inspection = baseInspection();
    inspection.inspectionDate = new Date();
    inspection.property = { address: "Hlavná 1" } as never;
    expect(computeStepCompletion(inspection)["zakladne-udaje"]).toBe(true);
  });

  it("marks miestnosti complete only when every room has at least one element", () => {
    const inspection = baseInspection();
    inspection.rooms = [{ id: "r1", elements: [{ id: "e1" }] }] as never;
    expect(computeStepCompletion(inspection).miestnosti).toBe(true);

    inspection.rooms = [{ id: "r1", elements: [] }] as never;
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
