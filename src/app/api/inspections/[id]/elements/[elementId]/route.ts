import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { elementUpdateSchema } from "@/lib/validation";

async function loadElement(elementId: string, inspectionId: string) {
  const element = await db.inspectionElement.findUnique({
    where: { id: elementId },
    include: { category: true },
  });
  if (!element || element.category.inspectionId !== inspectionId) {
    throw new ApiError(404, "Prvok nebol nájdený");
  }
  return element;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; elementId: string }> }) {
  try {
    const user = await requireSession();
    const { id, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadElement(elementId, id);
    const data = elementUpdateSchema.parse(await req.json());
    const updated = await db.inspectionElement.update({ where: { id: elementId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; elementId: string }> }) {
  try {
    const user = await requireSession();
    const { id, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadElement(elementId, id);
    await db.inspectionElement.delete({ where: { id: elementId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
