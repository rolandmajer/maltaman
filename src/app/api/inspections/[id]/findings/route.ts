import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { findingSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const findings = await db.finding.findMany({
      where: { inspectionId: id },
      orderBy: { order: "asc" },
      include: { measurements: true, photos: true, costItems: true },
    });
    return NextResponse.json(findings);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const data = findingSchema.parse(await req.json());
    const maxOrder = await db.finding.aggregate({ where: { inspectionId: id }, _max: { order: true } });
    const finding = await db.finding.create({
      data: { ...data, inspectionId: id, order: data.order ?? (maxOrder._max.order ?? -1) + 1 },
    });
    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
