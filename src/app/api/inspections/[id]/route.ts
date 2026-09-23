import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { inspectionUpdateSchema } from "@/lib/validation";
import { getFullInspection } from "@/lib/inspection-service";
import { deletePhotoFile } from "@/lib/storage";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const inspection = await getFullInspection(id);
    return NextResponse.json(inspection);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const data = inspectionUpdateSchema.parse(await req.json());
    const updated = await db.inspection.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const photos = await db.photo.findMany({
      where: { inspectionId: id },
      select: { storageKey: true, thumbnailKey: true },
    });
    await db.$transaction([
      db.inspection.updateMany({ where: { parentInspectionId: id }, data: { parentInspectionId: null } }),
      db.inspection.delete({ where: { id } }),
    ]);
    const cleanup = await Promise.allSettled(photos.map((photo) => deletePhotoFile(photo.storageKey, photo.thumbnailKey)));
    cleanup.forEach((result, index) => {
      if (result.status === "rejected") console.error(`Nepodarilo sa odstrániť súbory fotografie ${photos[index].storageKey}:`, result.reason);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
