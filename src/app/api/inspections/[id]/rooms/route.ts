import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roomSchema } from "@/lib/validation";
import { seedRoomElements } from "@/lib/room-element-service";

const ROOM_FULL_INCLUDE = {
  elements: {
    orderBy: { order: "asc" as const },
    include: {
      attributes: true,
      conditions: {
        orderBy: { order: "asc" as const },
        include: { measurements: true, photos: true, costItems: true },
      },
      photos: true,
      costItems: true,
    },
  },
  photos: true,
  costItems: true,
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const rooms = await db.room.findMany({
      where: { inspectionId: id },
      orderBy: { order: "asc" },
      include: ROOM_FULL_INCLUDE,
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

    const room = await db.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: { ...data, inspectionId: id, order: data.order ?? (maxOrder._max.order ?? -1) + 1 },
      });
      await seedRoomElements(tx, created.id, data.type);
      return tx.room.findUnique({ where: { id: created.id }, include: ROOM_FULL_INCLUDE });
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
