import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { readPhotoFile } from "@/lib/storage";

// Photos are never public — every request is authenticated and scoped to the caller's organisation.
export async function GET(req: NextRequest, ctx: { params: Promise<{ photoId: string }> }) {
  try {
    const user = await requireSession();
    const { photoId } = await ctx.params;
    const photo = await db.photo.findUnique({ where: { id: photoId }, include: { inspection: true } });
    if (!photo || photo.inspection.organisationId !== user.organisationId) {
      throw new ApiError(404, "Fotografia nebola nájdená");
    }

    const wantsThumb = req.nextUrl.searchParams.get("thumb") === "1";
    const bytes = await readPhotoFile(wantsThumb && photo.thumbnailKey ? photo.thumbnailKey : photo.storageKey, wantsThumb);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
