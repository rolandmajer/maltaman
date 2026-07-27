import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roomElementSchema } from "@/lib/validation";

const ELEMENT_FULL_INCLUDE = {
  attributes: true,
  conditions: {
    orderBy: { order: "asc" as const },
    include: { measurements: true, photos: true, costItems: true },
  },
  photos: true,
  costItems: true,
};

async function loadRoom(roomId: string, inspectionId: string) {
  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room || room.inspectionId !== inspectionId) throw new ApiError(404, "Miestnosť nebola nájdená");
  return room;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoom(roomId, id);
    const elements = await db.roomElement.findMany({
      where: { roomId },
      orderBy: { order: "asc" },
      include: ELEMENT_FULL_INCLUDE,
    });
    return NextResponse.json(elements);
  } catch (error) {
    return jsonError(error);
  }
}

/** Adds another instance of an element (e.g. a 2nd window) — for elements configured allowMultiple. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoom(roomId, id);
    const data = roomElementSchema.parse(await req.json());

    const maxOrder = await db.roomElement.aggregate({ where: { roomId }, _max: { order: true } });
    const element = await db.roomElement.create({
      data: { ...data, roomId, order: data.order ?? (maxOrder._max.order ?? -1) + 1 },
      include: ELEMENT_FULL_INCLUDE,
    });
    return NextResponse.json(element, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
