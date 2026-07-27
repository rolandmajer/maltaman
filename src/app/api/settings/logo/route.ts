import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, savePhotoFile, readPhotoFile } from "@/lib/storage";

export async function GET() {
  try {
    const user = await requireSession();
    const settings = await db.appSettings.findUnique({ where: { organisationId: user.organisationId } });
    if (!settings?.logoUrl) throw new ApiError(404, "Logo nie je nastavené");
    const bytes = await readPhotoFile(settings.logoUrl);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Chýba súbor loga");
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new ApiError(400, "Nepodporovaný formát súboru");
    if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, "Súbor je príliš veľký");

    const bytes = Buffer.from(await file.arrayBuffer());
    let storageKey: string;
    try {
      ({ storageKey } = await savePhotoFile(bytes));
    } catch (error) {
      console.error("savePhotoFile failed:", error);
      const detail = error instanceof Error ? error.message : String(error);
      throw new ApiError(502, `Uloženie loga do úložiska zlyhalo: ${detail}`);
    }

    const updated = await db.appSettings.update({
      where: { organisationId: user.organisationId },
      data: { logoUrl: storageKey },
    });
    return NextResponse.json({ logoUrl: updated.logoUrl });
  } catch (error) {
    return jsonError(error);
  }
}
