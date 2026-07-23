import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { userId } = await ctx.params;

    if (userId === admin.id) throw new ApiError(400, "Nemôžete odstrániť vlastný účet");

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.organisationId !== admin.organisationId) {
      throw new ApiError(404, "Používateľ nebol nájdený");
    }

    try {
      await db.user.delete({ where: { id: userId } });
    } catch (error) {
      // Inspection.createdBy / ReportRevision.createdBy restrict deletion — surface it clearly
      // instead of a generic 500. (P2003 = foreign key constraint violation.)
      if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2003") {
        throw new ApiError(409, "Používateľa nemožno odstrániť — má vytvorené obhliadky alebo revízie");
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
