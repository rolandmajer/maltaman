import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { loadElementCondition } from "@/lib/room-element-service";

type Params = { id: string; roomId: string; elementId: string; conditionId: string };

/** Duplicates a condition entry (structured fields + measurements, not photos — a duplicate is
 * meant as a starting point for recording the same issue at a different spot). */
export async function POST(_req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId, conditionId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const source = await loadElementCondition(conditionId, elementId, roomId, id);
    const sourceWithMeasurements = await db.elementCondition.findUniqueOrThrow({
      where: { id: conditionId },
      include: { measurements: true },
    });

    const maxOrder = await db.elementCondition.aggregate({ where: { roomElementId: elementId }, _max: { order: true } });
    const duplicate = await db.elementCondition.create({
      data: {
        roomElementId: elementId,
        defectTypes: source.defectTypes,
        location: source.location,
        extent: source.extent,
        severity: source.severity,
        cause: source.cause,
        recommendedAction: source.recommendedAction,
        deadline: source.deadline,
        note: source.note,
        includeInSummary: source.includeInSummary,
        excludeFromReport: source.excludeFromReport,
        order: (maxOrder._max.order ?? -1) + 1,
        measurements: {
          create: sourceWithMeasurements.measurements.map((m) => ({
            label: m.label,
            value: m.value,
            unit: m.unit,
            note: m.note,
            order: m.order,
          })),
        },
      },
      include: { measurements: true, photos: true, costItems: true },
    });
    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
