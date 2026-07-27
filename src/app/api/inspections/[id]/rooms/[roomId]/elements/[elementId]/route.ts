import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roomElementUpdateSchema } from "@/lib/validation";
import { loadRoomElement } from "@/lib/room-element-service";

type Params = { id: string; roomId: string; elementId: string };

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoomElement(elementId, roomId, id);
    const data = roomElementUpdateSchema.parse(await req.json());
    const updated = await db.roomElement.update({
      where: { id: elementId },
      data,
      include: {
        attributes: true,
        conditions: { orderBy: { order: "asc" }, include: { measurements: true, photos: true, costItems: true } },
        photos: true,
        costItems: true,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoomElement(elementId, roomId, id);
    await db.roomElement.delete({ where: { id: elementId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
