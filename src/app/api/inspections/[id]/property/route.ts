import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { propertyUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const data = propertyUpdateSchema.parse(await req.json());
    const property = await db.property.upsert({
      where: { inspectionId: id },
      create: { inspectionId: id, ...data },
      update: data,
    });
    return NextResponse.json(property);
  } catch (error) {
    return jsonError(error);
  }
}
