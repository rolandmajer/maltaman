import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, savePhotoFile } from "@/lib/storage";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const photos = await db.photo.findMany({ where: { inspectionId: id }, orderBy: { order: "asc" } });
    return NextResponse.json(photos);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Chýba súbor fotografie");
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ApiError(400, "Nepodporovaný formát súboru. Použite JPEG, PNG, WebP alebo HEIC.");
    }
    if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, "Súbor je príliš veľký (max. 20 MB).");

    const roomId = formData.get("roomId");
    const findingId = formData.get("findingId");
    const elementId = formData.get("elementId");
    const caption = formData.get("caption");
    const capturedAt = formData.get("capturedAt");
    const gpsLat = formData.get("gpsLat");
    const gpsLng = formData.get("gpsLng");

    const bytes = Buffer.from(await file.arrayBuffer());
    const { storageKey, thumbnailKey } = await savePhotoFile(bytes);

    const maxOrder = await db.photo.aggregate({ where: { inspectionId: id }, _max: { order: true } });
    const existingCount = await db.photo.count({ where: { inspectionId: id } });

    const photo = await db.photo.create({
      data: {
        inspectionId: id,
        roomId: typeof roomId === "string" && roomId ? roomId : null,
        findingId: typeof findingId === "string" && findingId ? findingId : null,
        elementId: typeof elementId === "string" && elementId ? elementId : null,
        caption: typeof caption === "string" ? caption : "",
        storageKey,
        thumbnailKey,
        order: (maxOrder._max.order ?? -1) + 1,
        isCover: existingCount === 0,
        capturedAt: typeof capturedAt === "string" && capturedAt ? new Date(capturedAt) : new Date(),
        gpsLat: typeof gpsLat === "string" && gpsLat ? Number(gpsLat) : null,
        gpsLng: typeof gpsLng === "string" && gpsLng ? Number(gpsLng) : null,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
