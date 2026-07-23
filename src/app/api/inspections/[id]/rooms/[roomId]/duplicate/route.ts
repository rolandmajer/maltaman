import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";

/** Duplicates a room along with its findings/measurements/cost items so similar bedrooms can be added quickly. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);

    const source = await db.room.findUnique({
      where: { id: roomId },
      include: {
        findings: { include: { measurements: true } },
        costItems: true,
      },
    });
    if (!source || source.inspectionId !== id) throw new ApiError(404, "Miestnosť nebola nájdená");

    const body = await req.json().catch(() => ({}));
    const name: string = body.name || `${source.name} (kópia)`;

    const maxOrder = await db.room.aggregate({ where: { inspectionId: id }, _max: { order: true } });

    const duplicated = await db.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          inspectionId: id,
          name,
          type: source.type,
          floorLevel: source.floorLevel,
          lengthM: source.lengthM,
          widthM: source.widthM,
          heightM: source.heightM,
          areaOverrideM2: source.areaOverrideM2,
          generalCondition: source.generalCondition,
          accessibility: source.accessibility,
          notes: source.notes,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });

      for (const finding of source.findings) {
        await tx.finding.create({
          data: {
            inspectionId: id,
            roomId: room.id,
            checklistKey: finding.checklistKey,
            label: finding.label,
            status: finding.status,
            description: finding.description,
            severity: finding.severity,
            location: finding.location,
            recommendedAction: finding.recommendedAction,
            recommendedSpecialist: finding.recommendedSpecialist,
            urgency: finding.urgency,
            isPositiveObservation: finding.isPositiveObservation,
            includeInSummary: finding.includeInSummary,
            order: finding.order,
            measurements: {
              create: finding.measurements.map((m) => ({
                label: m.label,
                value: m.value,
                unit: m.unit,
                note: m.note,
                order: m.order,
              })),
            },
          },
        });
      }

      for (const costItem of source.costItems) {
        await tx.costItem.create({
          data: {
            inspectionId: id,
            categoryId: costItem.categoryId,
            roomId: room.id,
            name: costItem.name,
            description: costItem.description,
            quantity: costItem.quantity,
            unit: costItem.unit,
            unitPrice: costItem.unitPrice,
            laborCost: costItem.laborCost,
            materialCost: costItem.materialCost,
            otherCost: costItem.otherCost,
            vatRatePercent: costItem.vatRatePercent,
            minEstimate: costItem.minEstimate,
            expectedEstimate: costItem.expectedEstimate,
            maxEstimate: costItem.maxEstimate,
            priority: costItem.priority,
            completionHorizon: costItem.completionHorizon,
            supplier: costItem.supplier,
            source: costItem.source,
            notes: costItem.notes,
            included: costItem.included,
            order: costItem.order,
          },
        });
      }

      return tx.room.findUnique({ where: { id: room.id }, include: { findings: true, costItems: true } });
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
