import type { Prisma } from "@/generated/prisma/client";
import { ROOM_CHECKLIST_ITEMS, WET_ROOM_TYPES, ROOM_TEMPLATES } from "@/lib/constants";
import { duplicatePhotoFile } from "@/lib/storage";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";

type TxClient = Prisma.TransactionClient;

/** Ownership-chain guard for a RoomElement, matching the paranoid style of loadRoom/loadFinding. */
export async function loadRoomElement(elementId: string, roomId: string, inspectionId: string) {
  const element = await db.roomElement.findUnique({ where: { id: elementId }, include: { room: true } });
  if (!element || element.roomId !== roomId || element.room.inspectionId !== inspectionId) {
    throw new ApiError(404, "Prvok nebol nájdený");
  }
  return element;
}

/** Ownership-chain guard for an ElementCondition. */
export async function loadElementCondition(conditionId: string, elementId: string, roomId: string, inspectionId: string) {
  const condition = await db.elementCondition.findUnique({
    where: { id: conditionId },
    include: { roomElement: { include: { room: true } } },
  });
  if (
    !condition ||
    condition.roomElementId !== elementId ||
    condition.roomElement.roomId !== roomId ||
    condition.roomElement.room.inspectionId !== inspectionId
  ) {
    throw new ApiError(404, "Zistenie nebolo nájdené");
  }
  return condition;
}

/**
 * Seeds a freshly-created room with the full RoomElement catalog (status OK, zero attributes —
 * attributes are created lazily as the technician picks them, since OK alone doesn't require
 * them). Applies wet-room gating the same way the old Finding-based checklist did, plus any
 * ROOM_TEMPLATES attribute pre-fill for the room's type ("Štandardná spálňa"/"Kúpeľňa"/...).
 */
export async function seedRoomElements(tx: TxClient, roomId: string, roomType: string) {
  const isWetRoom = WET_ROOM_TYPES.has(roomType);
  const applicable = ROOM_CHECKLIST_ITEMS.filter((item) => !item.wetRoomOnly || isWetRoom);

  await tx.roomElement.createMany({
    data: applicable.map((item, index) => ({
      roomId,
      elementKey: item.key,
      label: item.label,
      status: "OK" as const,
      order: index,
    })),
  });

  const template = ROOM_TEMPLATES[roomType];
  if (!template || template.length === 0) return;

  const elements = await tx.roomElement.findMany({ where: { roomId } });
  for (const entry of template) {
    const element = elements.find((e) => e.elementKey === entry.elementKey);
    if (!element) continue;
    await tx.elementAttribute.createMany({
      data: Object.entries(entry.attributes).map(([attributeKey, value]) => ({
        roomElementId: element.id,
        attributeKey,
        value,
      })),
    });
  }
}

/**
 * Which owner a photo is filed under. Duplication walks several trees — room, element, condition,
 * finding — and a photo tagged to a condition also carries its room's id, so "every photo on this
 * room" and "every photo on this room's conditions" overlap. Copying both lists duplicated the
 * overlap; these two predicates partition the set instead, so every photo is copied exactly once.
 */
export type PhotoOwnership = {
  roomId?: string | null;
  findingId?: string | null;
  elementId?: string | null;
  roomElementId?: string | null;
  elementConditionId?: string | null;
};

/** A photo filed against the room itself — not against any element, condition or finding in it. */
export function isRoomOnlyPhoto(photo: PhotoOwnership) {
  return !photo.roomElementId && !photo.elementConditionId && !photo.findingId && !photo.elementId;
}

/** A photo filed against nothing at all — the general shots from the Fotodokumentácia step. */
export function isLoosePhoto(photo: PhotoOwnership) {
  return !photo.roomId && isRoomOnlyPhoto(photo);
}

type SourceRoomTree = Prisma.RoomGetPayload<{
  include: {
    elements: {
      include: {
        attributes: true;
        conditions: { include: { measurements: true; photos: true } };
      };
    };
    photos: true;
  };
}>;

/**
 * Deep-copies one room's full element/attribute/condition/measurement/photo tree onto a
 * (usually just-created) target room. Used by both the single-room duplicate route and
 * duplicateInspectionDeep — this is the one shared implementation, replacing the checklist
 * re-seed / copy logic that used to be hand-rolled three separate ways.
 * Cost items are intentionally NOT copied — they're inspection-scoped estimates the technician
 * re-derives per inspection, matching today's behaviour.
 */
export async function copyRoomElementsDeep(
  tx: TxClient,
  sourceRoom: SourceRoomTree,
  targetRoomId: string,
  targetInspectionId: string,
  opts: { copyPhotos: boolean }
) {
  if (opts.copyPhotos) {
    // Photos pinned to the room itself rather than to an element — the "celkový pohľad" shots.
    // They were falling through both duplication paths: the element walk below never sees them
    // and the inspection-level copy skips anything that has a roomId.
    // A condition photo also carries its room's id, so it turns up in this list too; the element
    // walk below is what copies those, and taking them here as well would duplicate them.
    for (const photo of sourceRoom.photos.filter(isRoomOnlyPhoto)) {
      let copied: { storageKey: string; thumbnailKey: string | null };
      try {
        copied = await duplicatePhotoFile(photo.storageKey, photo.thumbnailKey);
      } catch (error) {
        console.error(`Skipping photo ${photo.id} while duplicating — file unavailable:`, error);
        continue;
      }
      await tx.photo.create({
        data: {
          inspectionId: targetInspectionId,
          roomId: targetRoomId,
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

  for (const el of sourceRoom.elements) {
    const newEl = await tx.roomElement.create({
      data: {
        roomId: targetRoomId,
        elementKey: el.elementKey,
        label: el.label,
        status: el.status,
        naReason: el.naReason,
        naReasonNote: el.naReasonNote,
        description: el.description,
        descriptionIsManual: el.descriptionIsManual,
        order: el.order,
        attributes: {
          create: el.attributes.map((a) => ({ attributeKey: a.attributeKey, value: a.value })),
        },
      },
    });

    for (const cond of el.conditions) {
      const newCond = await tx.elementCondition.create({
        data: {
          roomElementId: newEl.id,
          defectTypes: cond.defectTypes,
          location: cond.location,
          extent: cond.extent,
          severity: cond.severity,
          cause: cond.cause,
          recommendedAction: cond.recommendedAction,
          deadline: cond.deadline,
          note: cond.note,
          includeInSummary: cond.includeInSummary,
          excludeFromReport: cond.excludeFromReport,
          order: cond.order,
          measurements: {
            create: cond.measurements.map((m) => ({
              label: m.label,
              value: m.value,
              unit: m.unit,
              note: m.note,
              order: m.order,
            })),
          },
        },
      });

      if (opts.copyPhotos) {
        for (const photo of cond.photos) {
          // A blob that has gone missing from storage must not take the whole duplication down
          // with it — copy what is there and carry on, rather than failing the entire inspection.
          let copied: { storageKey: string; thumbnailKey: string | null };
          try {
            copied = await duplicatePhotoFile(photo.storageKey, photo.thumbnailKey);
          } catch (error) {
            console.error(`Skipping photo ${photo.id} while duplicating — file unavailable:`, error);
            continue;
          }
          const { storageKey, thumbnailKey } = copied;
          await tx.photo.create({
            data: {
              inspectionId: targetInspectionId,
              // Keep the room tag the source photo had, so it still shows under the room in the
              // Fotodokumentácia step and not only under its condition.
              roomId: targetRoomId,
              elementConditionId: newCond.id,
              storageKey,
              thumbnailKey,
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
    }
  }
}

/**
 * Copies one condition entry (structured fields + measurements, not photos) onto the matching
 * elementKey in another room, creating that RoomElement instance there first if it doesn't
 * already exist (e.g. a custom "Iné" element, or a 2nd-window instance that has no counterpart).
 * Used by both the single-target and multi-target "copy to room(s)" actions.
 */
export async function copyConditionToRoom(conditionId: string, targetRoomId: string) {
  const source = await db.elementCondition.findUniqueOrThrow({
    where: { id: conditionId },
    include: { measurements: true, roomElement: true },
  });

  let targetElement = await db.roomElement.findFirst({
    where: { roomId: targetRoomId, elementKey: source.roomElement.elementKey },
    orderBy: { order: "asc" },
  });
  if (!targetElement) {
    const maxOrder = await db.roomElement.aggregate({ where: { roomId: targetRoomId }, _max: { order: true } });
    targetElement = await db.roomElement.create({
      data: {
        roomId: targetRoomId,
        elementKey: source.roomElement.elementKey,
        label: source.roomElement.label,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  // Carry the source element's status across. Without this the copied defect lands under an
  // element still marked OK, so it never shows up in the room summary, Zhrnutie, or the PDF.
  if (isDefectStatus(source.roomElement.status) && targetElement.status !== source.roomElement.status) {
    targetElement = await db.roomElement.update({
      where: { id: targetElement.id },
      data: { status: source.roomElement.status },
    });
  }

  const maxCondOrder = await db.elementCondition.aggregate({
    where: { roomElementId: targetElement.id },
    _max: { order: true },
  });
  const created = await db.elementCondition.create({
    data: {
      roomElementId: targetElement.id,
      defectTypes: source.defectTypes,
      location: source.location,
      extent: source.extent,
      severity: source.severity,
      cause: source.cause,
      recommendedAction: source.recommendedAction,
      deadline: source.deadline,
      note: source.note,
      includeInSummary: source.includeInSummary,
      excludeFromReport: source.excludeFromReport,
      order: (maxCondOrder._max.order ?? -1) + 1,
      measurements: {
        create: source.measurements.map((m) => ({ label: m.label, value: m.value, unit: m.unit, note: m.note, order: m.order })),
      },
    },
    include: { measurements: true, photos: true, costItems: true },
  });

  await refreshRoomConditionSummary(targetRoomId);
  return created;
}

/**
 * Recomputes Room.generalCondition from its elements' statuses (e.g. "2 vady, 1 riziko").
 * Skipped once the technician has typed their own text — generalConditionIsManual mirrors
 * RoomElement.descriptionIsManual, so a hand-written assessment is never silently overwritten.
 */
export async function refreshRoomConditionSummary(roomId: string) {
  const room = await db.room.findUnique({ where: { id: roomId }, include: { elements: true } });
  if (!room || room.generalConditionIsManual) return;

  const summary = summariseRoomCondition(room.elements.map((el) => el.status));
  if (summary !== room.generalCondition) {
    await db.room.update({ where: { id: roomId }, data: { generalCondition: summary } });
  }
}

/** Pure counterpart of refreshRoomConditionSummary — e.g. ["V","V","R"] → "2 vady, 1 riziko". */
export function summariseRoomCondition(statuses: string[]): string {
  const counts = { V: 0, R: 0, N: 0 };
  for (const status of statuses) {
    if (status === "V") counts.V++;
    else if (status === "R") counts.R++;
    else if (status === "N") counts.N++;
  }

  const parts: string[] = [];
  if (counts.V) parts.push(`${counts.V} ${plural(counts.V, "vada", "vady", "vád")}`);
  if (counts.R) parts.push(`${counts.R} ${plural(counts.R, "riziko", "riziká", "rizík")}`);
  if (counts.N) parts.push(`${counts.N} ${plural(counts.N, "neposúdený prvok", "neposúdené prvky", "neposúdených prvkov")}`);
  return parts.length ? parts.join(", ") : "Bez zistených vád";
}

/** Slovak count agreement: 1 → one, 2–4 → few, 5+ → many. */
function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

function isDefectStatus(status: string) {
  return status === "V" || status === "R";
}

/**
 * Copies a full element assessment (status, N/A reason, description, attributes, and — appended
 * as new entries — its conditions) onto the matching elementKey in another room, creating that
 * instance there first if needed. Unlike applyElementAttributesToRooms (material/type only), this
 * is "copy this whole assessment to another room" — status and attributes are overwritten on the
 * target, conditions are appended (not replacing whatever the target already has).
 */
export async function copyElementAssessmentToRoom(sourceElementId: string, targetRoomId: string) {
  const source = await db.roomElement.findUniqueOrThrow({
    where: { id: sourceElementId },
    include: { attributes: true, conditions: { include: { measurements: true } } },
  });

  let targetElement = await db.roomElement.findFirst({
    where: { roomId: targetRoomId, elementKey: source.elementKey },
    orderBy: { order: "asc" },
  });
  if (!targetElement) {
    const maxOrder = await db.roomElement.aggregate({ where: { roomId: targetRoomId }, _max: { order: true } });
    targetElement = await db.roomElement.create({
      data: { roomId: targetRoomId, elementKey: source.elementKey, label: source.label, order: (maxOrder._max.order ?? -1) + 1 },
    });
  }

  await db.roomElement.update({
    where: { id: targetElement.id },
    data: {
      status: source.status,
      naReason: source.naReason,
      naReasonNote: source.naReasonNote,
      description: source.description,
      descriptionIsManual: source.descriptionIsManual,
    },
  });

  for (const attr of source.attributes) {
    await db.elementAttribute.upsert({
      where: { roomElementId_attributeKey: { roomElementId: targetElement.id, attributeKey: attr.attributeKey } },
      create: { roomElementId: targetElement.id, attributeKey: attr.attributeKey, value: attr.value },
      update: { value: attr.value },
    });
  }

  const maxCondOrder = await db.elementCondition.aggregate({ where: { roomElementId: targetElement.id }, _max: { order: true } });
  let nextOrder = (maxCondOrder._max.order ?? -1) + 1;
  for (const cond of source.conditions) {
    await db.elementCondition.create({
      data: {
        roomElementId: targetElement.id,
        defectTypes: cond.defectTypes,
        location: cond.location,
        extent: cond.extent,
        severity: cond.severity,
        cause: cond.cause,
        recommendedAction: cond.recommendedAction,
        deadline: cond.deadline,
        note: cond.note,
        includeInSummary: cond.includeInSummary,
        excludeFromReport: cond.excludeFromReport,
        order: nextOrder++,
        measurements: {
          create: cond.measurements.map((m) => ({ label: m.label, value: m.value, unit: m.unit, note: m.note, order: m.order })),
        },
      },
    });
  }

  await refreshRoomConditionSummary(targetRoomId);

  return db.roomElement.findUniqueOrThrow({
    where: { id: targetElement.id },
    include: { attributes: true, conditions: { include: { measurements: true, photos: true, costItems: true } }, photos: true, costItems: true },
  });
}

/** Copies this element's attributes (not conditions/status) onto the matching elementKey in each target room. */
export async function applyElementAttributesToRooms(sourceElementId: string, targetRoomIds: string[]) {
  const source = await db.roomElement.findUniqueOrThrow({
    where: { id: sourceElementId },
    include: { attributes: true },
  });

  for (const targetRoomId of targetRoomIds) {
    let targetElement = await db.roomElement.findFirst({
      where: { roomId: targetRoomId, elementKey: source.elementKey },
      orderBy: { order: "asc" },
    });
    if (!targetElement) {
      const maxOrder = await db.roomElement.aggregate({ where: { roomId: targetRoomId }, _max: { order: true } });
      targetElement = await db.roomElement.create({
        data: {
          roomId: targetRoomId,
          elementKey: source.elementKey,
          label: source.label,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });
    }
    for (const attr of source.attributes) {
      await db.elementAttribute.upsert({
        where: { roomElementId_attributeKey: { roomElementId: targetElement.id, attributeKey: attr.attributeKey } },
        create: { roomElementId: targetElement.id, attributeKey: attr.attributeKey, value: attr.value },
        update: { value: attr.value },
      });
    }
  }
}
