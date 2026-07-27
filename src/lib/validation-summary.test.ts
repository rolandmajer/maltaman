import { describe, it, expect } from "vitest";
import { computeValidationSummary } from "./validation-summary";
import type { INSPECTION_FULL_INCLUDE } from "./inspection-service";
import type { Prisma } from "@/generated/prisma/client";

type FullInspection = Prisma.InspectionGetPayload<{ include: typeof INSPECTION_FULL_INCLUDE }>;

function baseInspection(): FullInspection {
  return {
    inspectionDate: new Date(),
    property: { address: "Hlavná 1" },
    participants: [],
    rooms: [],
    categories: [],
    findings: [],
    costItems: [],
    recommendations: [],
    photos: [],
    signatures: [{ role: "TECHNICIAN", imageDataUrl: "data:image/png;base64,abc" }],
    overallVerdict: "PURCHASE_NO_OBJECTIONS",
  } as unknown as FullInspection;
}

describe("computeValidationSummary", () => {
  it("allows completion once date, address and a technician signature are present", () => {
    const summary = computeValidationSummary(baseInspection());
    expect(summary.canComplete).toBe(true);
    expect(summary.blockers).toHaveLength(0);
  });

  it("blocks completion when the inspection date is missing", () => {
    const inspection = baseInspection();
    inspection.inspectionDate = null;
    const summary = computeValidationSummary(inspection);
    expect(summary.canComplete).toBe(false);
    expect(summary.blockers.some((b) => b.code === "missing-date")).toBe(true);
  });

  it("blocks completion when the property address is missing", () => {
    const inspection = baseInspection();
    inspection.property = { address: "" } as never;
    const summary = computeValidationSummary(inspection);
    expect(summary.blockers.some((b) => b.code === "missing-address")).toBe(true);
  });

  it("blocks completion when there is no signed technician signature", () => {
    const inspection = baseInspection();
    inspection.signatures = [];
    const summary = computeValidationSummary(inspection);
    expect(summary.blockers.some((b) => b.code === "missing-signature")).toBe(true);
  });

  it("warns but does not block when there are no rooms or photos", () => {
    const summary = computeValidationSummary(baseInspection());
    expect(summary.warnings.some((w) => w.code === "no-rooms")).toBe(true);
    expect(summary.warnings.some((w) => w.code === "no-photos")).toBe(true);
    expect(summary.canComplete).toBe(true);
  });

  it("warns about V/R elements that have zero recorded condition entries", () => {
    const inspection = baseInspection();
    inspection.rooms = [
      {
        id: "r1",
        name: "Kúpeľňa",
        elements: [{ id: "e1", status: "V", conditions: [] }],
      },
    ] as never;
    const summary = computeValidationSummary(inspection);
    expect(summary.warnings.some((w) => w.code === "room-r1-desc")).toBe(true);
  });

  it("does not warn when a V/R element has at least one condition entry", () => {
    const inspection = baseInspection();
    inspection.rooms = [
      {
        id: "r1",
        name: "Kúpeľňa",
        elements: [{ id: "e1", status: "V", conditions: [{ id: "c1" }] }],
      },
    ] as never;
    const summary = computeValidationSummary(inspection);
    expect(summary.warnings.some((w) => w.code === "room-r1-desc")).toBe(false);
  });
});
