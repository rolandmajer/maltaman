import { db } from "@/lib/db";
import { DEFAULT_COST_CATEGORIES, DEFAULT_TECHNICAL_CATEGORIES } from "@/lib/constants";
import { nextProtocolNumber } from "@/lib/format";
import { copyRoomElementsDeep, isLoosePhoto } from "@/lib/room-element-service";
import { duplicatePhotoFile } from "@/lib/storage";

export const INSPECTION_FULL_INCLUDE = {
  property: true,
  conditions: true,
  participants: { orderBy: { order: "asc" as const } },
  rooms: {
    orderBy: { order: "asc" as const },
    include: {
      elements: {
        orderBy: { order: "asc" as const },
        include: {
          attributes: true,
          conditions: {
            orderBy: { order: "asc" as const },
            include: { measurements: true, photos: true, costItems: true },
          },
          photos: true,
          costItems: true,
        },
      },
      photos: { orderBy: { order: "asc" as const } },
      costItems: { orderBy: { order: "asc" as const } },
    },
  },
  categories: {
    orderBy: { order: "asc" as const },
    include: {
      elements: {
        orderBy: { order: "asc" as const },
        include: { findings: { include: { measurements: true, photos: true } }, photos: true },
      },
    },
  },
  findings: { orderBy: { order: "asc" as const }, include: { measurements: true, photos: true } },
  photos: { orderBy: { order: "asc" as const } },
  costCategories: { orderBy: { order: "asc" as const } },
  costItems: { orderBy: { order: "asc" as const } },
  recommendations: { orderBy: { order: "asc" as const } },
  signatures: true,
  amenityPlaces: { orderBy: { distanceM: "asc" as const } },
  reportRevisions: { orderBy: { createdAt: "asc" as const } },
  createdBy: { select: { id: true, name: true, registrationNumber: true } },
} as const;

export async function getFullInspection(inspectionId: string) {
  return db.inspection.findUnique({ where: { id: inspectionId }, include: INSPECTION_FULL_INCLUDE });
}

async function generateProtocolNumber(organisationId: string, prefix: string) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await db.inspection.count({
      where: { organisationId, protocolNumber: { startsWith: `${prefix}-${year}-` } },
    });
    const candidate = nextProtocolNumber(prefix, year, count + 1 + attempt);
    const exists = await db.inspection.findUnique({
      where: { organisationId_protocolNumber: { organisationId, protocolNumber: candidate } },
    });
    if (!exists) return candidate;
  }
  return nextProtocolNumber(prefix, year, Date.now() % 100000);
}

/** Creates a new inspection pre-seeded with default technical categories/cost categories from settings. */
export async function createInspection(params: {
  organisationId: string;
  createdById: string;
  propertyType?: string;
  purpose?: string;
  inspectionDate?: Date;
}) {
  const settings = await db.appSettings.findUnique({ where: { organisationId: params.organisationId } });
  const prefix = settings?.protocolNumberPrefix ?? "PZ";
  const protocolNumber = await generateProtocolNumber(params.organisationId, prefix);

  const costCategoryNames: string[] = settings?.costCategoryPresets
    ? (JSON.parse(settings.costCategoryPresets) as string[])
    : [];
  const finalCostCategories = costCategoryNames.length > 0 ? costCategoryNames : DEFAULT_COST_CATEGORIES;

  const inspection = await db.inspection.create({
    data: {
      organisationId: params.organisationId,
      createdById: params.createdById,
      protocolNumber,
      propertyType: params.propertyType,
      purpose: params.purpose,
      inspectionDate: params.inspectionDate,
      contingencyPercent: settings?.defaultContingencyPercent ?? 10,
      property: { create: {} },
      conditions: { create: {} },
      categories: {
        create: DEFAULT_TECHNICAL_CATEGORIES.map((cat, catIndex) => ({
          name: cat.name,
          order: catIndex,
          isCustom: false,
          elements: {
            create: cat.elements.map((elName, elIndex) => ({ name: elName, order: elIndex, isCustom: false })),
          },
        })),
      },
      costCategories: {
        create: finalCostCategories.map((name, index) => ({ name, order: index, isCustom: false })),
      },
    },
    include: { categories: { include: { elements: true } } },
  });

  // Every technical element gets a default Finding (status OK) so the UI never has to
  // distinguish "not yet assessed" from "assessed as fine" — mirrors the room checklist.
  const elements = inspection.categories.flatMap((c) => c.elements);
  if (elements.length > 0) {
    await db.finding.createMany({
      data: elements.map((el) => ({
        inspectionId: inspection.id,
        elementId: el.id,
        label: el.name,
        status: "OK" as const,
        order: el.order,
      })),
    });
  }

  return getFullInspection(inspection.id) as Promise<NonNullable<Awaited<ReturnType<typeof getFullInspection>>>>;
}

/** Full deep copy of an inspection (new protocol number, DRAFT status, no revision link) for "Duplicate inspection". */
export async function duplicateInspectionDeep(sourceId: string, createdById: string) {
  const source = await getFullInspection(sourceId);
  if (!source) return null;

  const settings = await db.appSettings.findUnique({ where: { organisationId: source.organisationId } });
  const protocolNumber = await generateProtocolNumber(source.organisationId, settings?.protocolNumberPrefix ?? "PZ");

  return db.$transaction(async (tx) => {
    const inspection = await tx.inspection.create({
      data: {
        organisationId: source.organisationId,
        createdById,
        protocolNumber,
        propertyType: source.propertyType,
        purpose: source.purpose,
        inspectionDate: source.inspectionDate,
        startTime: source.startTime,
        endTime: source.endTime,
        generalNote: source.generalNote,
        // Steps 5 and 7 are plain columns on the inspection. Leaving them out meant a revision
        // opened with an empty Zhrnutie and Odporúčania — the technician's whole written
        // assessment and verdict gone, with nothing to indicate it had ever been there.
        overallConditionRating: source.overallConditionRating,
        mainRisks: source.mainRisks,
        immediateActions: source.immediateActions,
        followUpInspections: source.followUpInspections,
        overallVerdict: source.overallVerdict,
        recommendedDiscountAmount: source.recommendedDiscountAmount,
        verdictJustification: source.verdictJustification,
        contingencyPercent: source.contingencyPercent,
        costsIncludeVat: source.costsIncludeVat,
        costsEnteredInclVat: source.costsEnteredInclVat,
        amenitiesEnabled: source.amenitiesEnabled,
        amenitiesGeneratedAt: source.amenitiesGeneratedAt,
        amenitiesLat: source.amenitiesLat,
        amenitiesLng: source.amenitiesLng,
        amenitiesLocationLabel: source.amenitiesLocationLabel,
        property: source.property
          ? { create: { ...stripId(source.property) } }
          : { create: {} },
        conditions: source.conditions
          ? { create: { ...stripId(source.conditions) } }
          : { create: {} },
      },
    });

    const categoryIdMap = new Map<string, string>();
    // Findings are keyed off the *old* element ids, so remember which new element each one maps to.
    const elementIdMap = new Map<string, string>();
    for (const category of source.categories) {
      const newCategory = await tx.inspectionCategory.create({
        data: { inspectionId: inspection.id, name: category.name, order: category.order, isCustom: category.isCustom },
      });
      categoryIdMap.set(category.id, newCategory.id);
      for (const element of category.elements) {
        const newElement = await tx.inspectionElement.create({
          data: { categoryId: newCategory.id, name: element.name, order: element.order, isCustom: element.isCustom },
        });
        elementIdMap.set(element.id, newElement.id);
      }
    }

    // The Technický stav step lives entirely in Finding rows. Copying the elements without them
    // left a duplicate — and therefore every revision — with an empty technical step: the recorded
    // statuses, descriptions, severities and measurements were all silently dropped.
    const findingIdMap = new Map<string, string>();
    for (const finding of source.findings) {
      const newFinding = await tx.finding.create({
        data: {
          inspectionId: inspection.id,
          elementId: finding.elementId ? (elementIdMap.get(finding.elementId) ?? null) : null,
          checklistKey: finding.checklistKey,
          label: finding.label,
          status: finding.status,
          defectTypes: finding.defectTypes,
          description: finding.description,
          severity: finding.severity,
          location: finding.location,
          recommendedAction: finding.recommendedAction,
          recommendedSpecialist: finding.recommendedSpecialist,
          urgency: finding.urgency,
          isPositiveObservation: finding.isPositiveObservation,
          includeInSummary: finding.includeInSummary,
          order: finding.order,
          measurements: {
            create: finding.measurements.map((m) => ({
              label: m.label,
              value: m.value,
              unit: m.unit,
              note: m.note,
              order: m.order,
            })),
          },
        },
      });

      findingIdMap.set(finding.id, newFinding.id);

      for (const photo of finding.photos) {
        // Same rule as the room elements: a blob missing from storage is skipped, not fatal.
        let copied: { storageKey: string; thumbnailKey: string | null };
        try {
          copied = await duplicatePhotoFile(photo.storageKey, photo.thumbnailKey);
        } catch (error) {
          console.error(`Skipping photo ${photo.id} while duplicating — file unavailable:`, error);
          continue;
        }
        await tx.photo.create({
          data: {
            inspectionId: inspection.id,
            findingId: newFinding.id,
            storageKey: copied.storageKey,
            thumbnailKey: copied.thumbnailKey,
            caption: photo.caption,
            rotationDegrees: photo.rotationDegrees,
            annotationsJson: photo.annotationsJson,
            isCover: photo.isCover,
            excludeFromReport: photo.excludeFromReport,
            order: photo.order,
            capturedAt: photo.capturedAt,
            gpsLat: photo.gpsLat,
            gpsLng: photo.gpsLng,
          },
        });
      }
    }

    const roomIdMap = new Map<string, string>();
    for (const room of source.rooms) {
      const newRoom = await tx.room.create({
        data: {
          inspectionId: inspection.id,
          name: room.name,
          type: room.type,
          floorLevel: room.floorLevel,
          lengthM: room.lengthM,
          widthM: room.widthM,
          heightM: room.heightM,
          areaOverrideM2: room.areaOverrideM2,
          generalCondition: room.generalCondition,
          accessibility: room.accessibility,
          notes: room.notes,
          order: room.order,
        },
      });
      roomIdMap.set(room.id, newRoom.id);
      await copyRoomElementsDeep(tx, room, newRoom.id, inspection.id, { copyPhotos: true });
    }

    const costCategoryIdMap = new Map<string, string>();
    for (const cc of source.costCategories) {
      const created = await tx.costCategory.create({
        data: { inspectionId: inspection.id, name: cc.name, order: cc.order, isCustom: cc.isCustom },
      });
      costCategoryIdMap.set(cc.id, created.id);
    }
    for (const item of source.costItems) {
      const newCategoryId = costCategoryIdMap.get(item.categoryId);
      if (!newCategoryId) continue;
      await tx.costItem.create({
        data: {
          inspectionId: inspection.id,
          categoryId: newCategoryId,
          roomId: item.roomId ? roomIdMap.get(item.roomId) : null,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          laborCost: item.laborCost,
          materialCost: item.materialCost,
          otherCost: item.otherCost,
          vatRatePercent: item.vatRatePercent,
          minEstimate: item.minEstimate,
          expectedEstimate: item.expectedEstimate,
          maxEstimate: item.maxEstimate,
          priority: item.priority,
          completionHorizon: item.completionHorizon,
          supplier: item.supplier,
          source: item.source,
          notes: item.notes,
          included: item.included,
          order: item.order,
        },
      });
    }

    for (const p of source.participants) {
      await tx.participant.create({
        data: {
          inspectionId: inspection.id,
          fullName: p.fullName,
          organisation: p.organisation,
          role: p.role,
          phone: p.phone,
          email: p.email,
          presentFrom: p.presentFrom,
          presentTo: p.presentTo,
          note: p.note,
          order: p.order,
        },
      });
    }

    // Photos attached to a room, element, condition or finding were copied alongside their owner.
    // What is left are the loose ones from the Fotodokumentácia step, which belong to no row and
    // would otherwise be the only part of that step missing from the copy.
    for (const photo of source.photos.filter(isLoosePhoto)) {
      let copied: { storageKey: string; thumbnailKey: string | null };
      try {
        copied = await duplicatePhotoFile(photo.storageKey, photo.thumbnailKey);
      } catch (error) {
        console.error(`Skipping photo ${photo.id} while duplicating — file unavailable:`, error);
        continue;
      }
      await tx.photo.create({
        data: {
          inspectionId: inspection.id,
          storageKey: copied.storageKey,
          thumbnailKey: copied.thumbnailKey,
          caption: photo.caption,
          rotationDegrees: photo.rotationDegrees,
          annotationsJson: photo.annotationsJson,
          isCover: photo.isCover,
          excludeFromReport: photo.excludeFromReport,
          order: photo.order,
          capturedAt: photo.capturedAt,
          gpsLat: photo.gpsLat,
          gpsLng: photo.gpsLng,
        },
      });
    }

    // Recommendations point at a room and/or a finding; both were just re-created, so the links
    // are remapped onto the copies rather than left dangling at the source inspection's rows.
    for (const rec of source.recommendations) {
      await tx.recommendation.create({
        data: {
          inspectionId: inspection.id,
          category: rec.category,
          text: rec.text,
          relatedRoomId: rec.relatedRoomId ? (roomIdMap.get(rec.relatedRoomId) ?? null) : null,
          relatedFindingId: rec.relatedFindingId ? (findingIdMap.get(rec.relatedFindingId) ?? null) : null,
          order: rec.order,
        },
      });
    }

    // The property (and therefore the location) is copied verbatim, so the amenities still apply —
    // carrying them over saves re-running the lookup against OpenStreetMap for the same address.
    for (const place of source.amenityPlaces) {
      await tx.amenityPlace.create({
        data: {
          inspectionId: inspection.id,
          category: place.category,
          name: place.name,
          distanceM: place.distanceM,
          walkMinutes: place.walkMinutes,
          driveMinutes: place.driveMinutes,
          lat: place.lat,
          lng: place.lng,
          note: place.note,
          isManual: place.isManual,
          includeInReport: place.includeInReport,
          order: place.order,
        },
      });
    }

    return tx.inspection.findUnique({ where: { id: inspection.id }, include: INSPECTION_FULL_INCLUDE });
  });
}

/**
 * Strips the primary key *and* the parent foreign key before re-creating a row as a nested
 * `create`. Prisma rejects `inspectionId` inside a nested create — it sets that relation itself —
 * so leaving it in made every duplicate and revision fail with a 500. TypeScript doesn't catch it
 * because an object spread skips excess-property checking.
 */
export function stripId<T extends { id: string; inspectionId?: string }>(obj: T): Omit<T, "id" | "inspectionId"> {
  const { id: _id, inspectionId: _inspectionId, ...rest } = obj;
  void _id;
  void _inspectionId;
  return rest;
}

/** Opens a new revision of a completed inspection: a fresh DRAFT copy linked via parentInspectionId. */
export async function createRevision(sourceId: string, createdById: string) {
  const copy = await duplicateInspectionDeep(sourceId, createdById);
  if (!copy) return null;
  const source = await db.inspection.findUnique({ where: { id: sourceId } });
  const revisionNumber = (source?.revisionNumber ?? 1) + 1;

  const updated = await db.inspection.update({
    where: { id: copy.id },
    data: { parentInspectionId: sourceId, revisionNumber },
    include: INSPECTION_FULL_INCLUDE,
  });

  await db.reportRevision.create({
    data: { inspectionId: sourceId, revisionNumber, createdById, note: `Vytvorená revízia č. ${revisionNumber}` },
  });

  return updated;
}
