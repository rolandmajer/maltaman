import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { categorySchema } from "@/lib/validation";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const categories = await db.inspectionCategory.findMany({
      where: { inspectionId: id },
      orderBy: { order: "asc" },
      include: { elements: { orderBy: { order: "asc" }, include: { findings: true } } },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const data = categorySchema.parse(await req.json());
    const maxOrder = await db.inspectionCategory.aggregate({
      where: { inspectionId: id },
      _max: { order: true },
    });
    const category = await db.inspectionCategory.create({
      data: { ...data, inspectionId: id, order: data.order ?? (maxOrder._max.order ?? -1) + 1, isCustom: true },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
