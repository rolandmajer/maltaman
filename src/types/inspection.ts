import type { Prisma } from "@/generated/prisma/client";
import type { INSPECTION_FULL_INCLUDE } from "@/lib/inspection-service";

export type FullInspection = Prisma.InspectionGetPayload<{ include: typeof INSPECTION_FULL_INCLUDE }>;

export type FullRoom = FullInspection["rooms"][number];
export type FullFinding = FullInspection["findings"][number];
export type FullCostItem = FullInspection["costItems"][number];
export type FullCostCategory = FullInspection["costCategories"][number];
export type FullCategory = FullInspection["categories"][number];
export type FullElement = FullCategory["elements"][number];
export type FullPhoto = FullInspection["photos"][number];
export type FullParticipant = FullInspection["participants"][number];
export type FullRecommendation = FullInspection["recommendations"][number];
export type FullSignature = FullInspection["signatures"][number];

export type InspectionListItem = Prisma.InspectionGetPayload<{
  include: {
    property: true;
    rooms: { select: { id: true } };
    findings: { select: { id: true; status: true } };
  };
}> & { costTotalInclVat: number };
