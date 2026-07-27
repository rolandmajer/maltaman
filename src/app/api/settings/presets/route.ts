import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { customPresetValueSchema } from "@/lib/validation";

/** Lists an org's remembered custom/recently-used values for one preset category, recent-first. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    if (!category) throw new ApiError(400, "Chýba kategória");
    const values = await db.customPresetValue.findMany({
      where: { organisationId: user.organisationId, category },
      orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }],
      take: 50,
    });
    return NextResponse.json(values);
  } catch (error) {
    return jsonError(error);
  }
}

/** Removes a remembered preset value (Settings editor "delete" action). */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSession();
    const url = new URL(req.url);
    const presetId = url.searchParams.get("id");
    if (!presetId) throw new ApiError(400, "Chýba id");
    const existing = await db.customPresetValue.findUnique({ where: { id: presetId } });
    if (!existing || existing.organisationId !== user.organisationId) {
      throw new ApiError(404, "Hodnota nebola nájdená");
    }
    await db.customPresetValue.delete({ where: { id: presetId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

/** Upserts one { category, value } — bumps usageCount/lastUsedAt on every selection, which is
 * what makes both preset and custom values rise in "recently used". */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const { category, value } = customPresetValueSchema.parse(await req.json());
    const upserted = await db.customPresetValue.upsert({
      where: { organisationId_category_value: { organisationId: user.organisationId, category, value } },
      create: { organisationId: user.organisationId, category, value, usageCount: 1 },
      update: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    return NextResponse.json(upserted);
  } catch (error) {
    return jsonError(error);
  }
}
