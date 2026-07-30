import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { copyRoomElementsDeep } from "@/lib/room-element-service";

/** Duplicates a room along with its element/attribute/condition/measurement/photo tree so similar bedrooms can be added quickly. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);

    const source = await db.room.findUnique({
      where: { id: roomId },
      include: {
        elements: {
          orderBy: { order: "asc" },
          include: { attributes: true, conditions: { orderBy: { order: "asc" }, include: { measurements: true, photos: true } } },
        },
        photos: { orderBy: { order: "asc" } },
      },
    });
    if (!source || source.inspectionId !== id) throw new ApiError(404, "Miestnosť nebola nájdená");

    const body = await req.json().catch(() => ({}));
    const name: string = body.name || `${source.name} (kópia)`;

    const maxOrder = await db.room.aggregate({ where: { inspectionId: id }, _max: { order: true } });

    const duplicated = await db.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          inspectionId: id,
          name,
          type: source.type,
          floorLevel: source.floorLevel,
          lengthM: source.lengthM,
          widthM: source.widthM,
          heightM: source.heightM,
          areaOverrideM2: source.areaOverrideM2,
          generalCondition: source.generalCondition,
          accessibility: source.accessibility,
          notes: source.notes,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });

      await copyRoomElementsDeep(tx, source, room.id, id, { copyPhotos: true });

      return tx.room.findUnique({
        where: { id: room.id },
        include: {
          elements: {
            orderBy: { order: "asc" },
            include: {
              attributes: true,
              conditions: { orderBy: { order: "asc" }, include: { measurements: true, photos: true, costItems: true } },
              photos: true,
              costItems: true,
            },
          },
          costItems: true,
        },
      });
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
