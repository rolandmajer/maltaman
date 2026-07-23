import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { elementSchema } from "@/lib/validation";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; categoryId: string }> }) {
  try {
    const user = await requireSession();
    const { id, categoryId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const category = await db.inspectionCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.inspectionId !== id) throw new ApiError(404, "Kategória nebola nájdená");

    const body = await req.json();
    const data = elementSchema.parse({ ...body, categoryId });
    const maxOrder = await db.inspectionElement.aggregate({ where: { categoryId }, _max: { order: true } });
    const element = await db.inspectionElement.create({
      data: {
        name: data.name,
        categoryId,
        order: data.order ?? (maxOrder._max.order ?? -1) + 1,
        isCustom: true,
        findings: {
          create: { inspectionId: id, label: data.name, status: "OK", order: 0 },
        },
      },
      include: { findings: true },
    });
    return NextResponse.json(element, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
