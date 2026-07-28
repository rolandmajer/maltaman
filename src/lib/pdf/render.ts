import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getFullInspection } from "@/lib/inspection-service";
import { readPhotoFile } from "@/lib/storage";
import { computeCostItem, computeCostTotals, type CostItemForTotals } from "@/lib/calculations";
import { InspectionDocument } from "@/lib/pdf/inspection-document";
import { ensureFontsRegistered } from "@/lib/pdf/fonts";

export async function renderInspectionPdf(inspectionId: string): Promise<Buffer> {
  ensureFontsRegistered();

  const inspection = await getFullInspection(inspectionId);
  if (!inspection) throw new Error("Obhliadka nebola nájdená");

  const settings = await db.appSettings.findUnique({ where: { organisationId: inspection.organisationId } });

  const categoryNameById = new Map(inspection.costCategories.map((c) => [c.id, c.name]));
  const roomNameById = new Map(inspection.rooms.map((r) => [r.id, r.name]));
  const totalsInput: CostItemForTotals[] = inspection.costItems.map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    categoryName: categoryNameById.get(item.categoryId) ?? "",
    roomId: item.roomId,
    roomName: item.roomId ? roomNameById.get(item.roomId) : null,
    priority: item.priority,
    included: item.included,
    ...computeCostItem(item),
  }));
  const totals = computeCostTotals(totalsInput, inspection.contingencyPercent);

  const includedPhotos = inspection.photos.filter((p) => !p.excludeFromReport).sort((a, b) => a.order - b.order);
  const photoBuffers = new Map<string, Buffer>();
  for (const photo of includedPhotos) {
    try {
      photoBuffers.set(photo.id, await readPhotoFile(photo.storageKey));
    } catch {
      // Skip photos whose file is missing from disk rather than failing the whole report.
    }
  }

  let logoBuffer: Buffer | undefined;
  if (settings?.logoUrl) {
    try {
      logoBuffer = await readPhotoFile(settings.logoUrl);
    } catch {
      logoBuffer = undefined;
    }
  }
  // Fall back to the bundled MALTAMAN wordmark when the org hasn't uploaded its own logo, so the
  // cover page never ships without a logo.
  if (!logoBuffer) {
    try {
      logoBuffer = await readFile(path.join(process.cwd(), "public/logo.png"));
    } catch {
      logoBuffer = undefined;
    }
  }

  const element = React.createElement(InspectionDocument, {
    inspection,
    settings,
    totals,
    photoBuffers,
    logoBuffer,
  });

  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
}
