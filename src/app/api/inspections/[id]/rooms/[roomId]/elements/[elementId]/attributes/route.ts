import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { elementAttributeSchema } from "@/lib/validation";
import { loadRoomElement } from "@/lib/room-element-service";

/** Upserts one { attributeKey, value } pair — idempotent, matches the @@unique([roomElementId, attributeKey]) constraint. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string; elementId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoomElement(elementId, roomId, id);
    const { attributeKey, value } = elementAttributeSchema.parse(await req.json());

    const attribute = await db.elementAttribute.upsert({
      where: { roomElementId_attributeKey: { roomElementId: elementId, attributeKey } },
      create: { roomElementId: elementId, attributeKey, value },
      update: { value },
    });
    return NextResponse.json(attribute);
  } catch (error) {
    return jsonError(error);
  }
}
