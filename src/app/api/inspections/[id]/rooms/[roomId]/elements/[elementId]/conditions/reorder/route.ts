import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { loadRoomElement } from "@/lib/room-element-service";

/** Bulk order update for drag-and-drop reordering — one round trip instead of N parallel PATCHes. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string; elementId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoomElement(elementId, roomId, id);

    const body = await req.json();
    const orderedIds: string[] = body.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.some((v) => typeof v !== "string")) {
      throw new ApiError(400, "Neplatné dáta");
    }

    const existing = await db.elementCondition.findMany({ where: { roomElementId: elementId }, select: { id: true } });
    const existingIds = new Set(existing.map((c) => c.id));
    if (orderedIds.length !== existingIds.size || orderedIds.some((cid) => !existingIds.has(cid))) {
      throw new ApiError(400, "Zoznam zistení nezodpovedá prvku");
    }

    await db.$transaction(
      orderedIds.map((conditionId, index) => db.elementCondition.update({ where: { id: conditionId }, data: { order: index } }))
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
