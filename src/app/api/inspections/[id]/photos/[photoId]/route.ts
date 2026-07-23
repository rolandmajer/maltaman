import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { photoUpdateSchema } from "@/lib/validation";
import { deletePhotoFile } from "@/lib/storage";

async function loadPhoto(photoId: string, inspectionId: string) {
  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.inspectionId !== inspectionId) throw new ApiError(404, "Fotografia nebola nájdená");
  return photo;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const user = await requireSession();
    const { id, photoId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadPhoto(photoId, id);
    const data = photoUpdateSchema.parse(await req.json());

    if (data.isCover) {
      // Only one cover photo per inspection.
      await db.photo.updateMany({ where: { inspectionId: id, isCover: true }, data: { isCover: false } });
    }

    const updated = await db.photo.update({ where: { id: photoId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const user = await requireSession();
    const { id, photoId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const photo = await loadPhoto(photoId, id);
    await db.photo.delete({ where: { id: photoId } });
    await deletePhotoFile(photo.storageKey, photo.thumbnailKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
