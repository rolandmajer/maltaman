import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roomSchema } from "@/lib/validation";
import { ROOM_CHECKLIST_ITEMS, WET_ROOM_TYPES } from "@/lib/constants";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const rooms = await db.room.findMany({
      where: { inspectionId: id },
      orderBy: { order: "asc" },
      include: { findings: true, photos: true, costItems: true },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const data = roomSchema.parse(await req.json());

    const maxOrder = await db.room.aggregate({ where: { inspectionId: id }, _max: { order: true } });
    const isWetRoom = WET_ROOM_TYPES.has(data.type);
    const applicableItems = ROOM_CHECKLIST_ITEMS.filter((item) => !item.wetRoomOnly || isWetRoom);

    const room = await db.room.create({
      data: {
        ...data,
        inspectionId: id,
        order: data.order ?? (maxOrder._max.order ?? -1) + 1,
        findings: {
          create: applicableItems.map((item, index) => ({
            inspectionId: id,
            checklistKey: item.key,
            label: item.label,
            status: "OK",
            order: index,
          })),
        },
      },
      include: { findings: true, photos: true, costItems: true },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
