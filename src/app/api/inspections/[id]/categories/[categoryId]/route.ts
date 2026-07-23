import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { categoryUpdateSchema } from "@/lib/validation";

async function loadCategory(categoryId: string, inspectionId: string) {
  const category = await db.inspectionCategory.findUnique({ where: { id: categoryId } });
  if (!category || category.inspectionId !== inspectionId) throw new ApiError(404, "Kategória nebola nájdená");
  return category;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; categoryId: string }> }) {
  try {
    const user = await requireSession();
    const { id, categoryId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadCategory(categoryId, id);
    const data = categoryUpdateSchema.parse(await req.json());
    const updated = await db.inspectionCategory.update({ where: { id: categoryId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; categoryId: string }> }) {
  try {
    const user = await requireSession();
    const { id, categoryId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadCategory(categoryId, id);
    await db.inspectionCategory.delete({ where: { id: categoryId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
