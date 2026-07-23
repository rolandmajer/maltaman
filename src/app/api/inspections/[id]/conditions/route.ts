import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { conditionsUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const data = conditionsUpdateSchema.parse(await req.json());
    const conditions = await db.inspectionConditions.upsert({
      where: { inspectionId: id },
      create: { inspectionId: id, ...data },
      update: data,
    });
    return NextResponse.json(conditions);
  } catch (error) {
    return jsonError(error);
  }
}
