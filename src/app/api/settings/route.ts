import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { appSettingsUpdateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireSession();
    const settings = await db.appSettings.findUnique({ where: { organisationId: user.organisationId } });
    if (!settings) return NextResponse.json({ error: "Nastavenia neboli nájdené" }, { status: 404 });
    return NextResponse.json({
      ...settings,
      costCategoryPresets: JSON.parse(settings.costCategoryPresets),
      roomTypePresets: JSON.parse(settings.roomTypePresets),
      quoteOptionalServices: JSON.parse(settings.quoteOptionalServices),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSession();
    const data = appSettingsUpdateSchema.parse(await req.json());
    const { costCategoryPresets, roomTypePresets, quoteOptionalServices, ...rest } = data;

    const updated = await db.appSettings.update({
      where: { organisationId: user.organisationId },
      data: {
        ...rest,
        ...(costCategoryPresets ? { costCategoryPresets: JSON.stringify(costCategoryPresets) } : {}),
        ...(roomTypePresets ? { roomTypePresets: JSON.stringify(roomTypePresets) } : {}),
        ...(quoteOptionalServices ? { quoteOptionalServices: JSON.stringify(quoteOptionalServices) } : {}),
      },
    });
    return NextResponse.json({
      ...updated,
      costCategoryPresets: JSON.parse(updated.costCategoryPresets),
      roomTypePresets: JSON.parse(updated.roomTypePresets),
      quoteOptionalServices: JSON.parse(updated.quoteOptionalServices),
    });
  } catch (error) {
    return jsonError(error);
  }
}
