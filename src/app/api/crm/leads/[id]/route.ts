import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { leadUpdateSchema } from "@/lib/validation";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const existing = await db.lead.findFirst({
      where: { id, organisationId: user.organisationId },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, "Lead nebol nájdený");

    const data = leadUpdateSchema.parse(await req.json());
    const lead = await db.lead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (error) {
    return jsonError(error);
  }
}
