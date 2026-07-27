import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { inspectionCreateSchema } from "@/lib/validation";
import { createInspection } from "@/lib/inspection-service";
import { computeCostItem } from "@/lib/calculations";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");

    const where: Prisma.InspectionWhereInput = { organisationId: user.organisationId };
    if (status === "DRAFT" || status === "COMPLETED") where.status = status;
    if (q) {
      where.OR = [
        { protocolNumber: { contains: q } },
        { property: { address: { contains: q } } },
        { property: { ownerName: { contains: q } } },
        { participants: { some: { fullName: { contains: q } } } },
      ];
    }

    const inspections = await db.inspection.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        property: true,
        rooms: { select: { id: true, elements: { select: { status: true } } } },
        findings: { select: { id: true, status: true } },
        costItems: {
          select: {
            included: true,
            quantity: true,
            unitPrice: true,
            laborCost: true,
            materialCost: true,
            otherCost: true,
            vatRatePercent: true,
          },
        },
      },
    });

    const withTotals = inspections.map((inspection) => {
      const totalInclVat = inspection.costItems
        .filter((i) => i.included)
        .reduce((sum, i) => sum + computeCostItem(i).priceInclVat, 0);
      const { costItems, ...rest } = inspection;
      void costItems;
      return { ...rest, costTotalInclVat: Math.round(totalInclVat * 100) / 100 };
    });

    return NextResponse.json(withTotals);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await req.json().catch(() => ({}));
    const data = inspectionCreateSchema.parse(body);
    const inspection = await createInspection({
      organisationId: user.organisationId,
      createdById: user.id,
      propertyType: data.propertyType,
      purpose: data.purpose,
      inspectionDate: data.inspectionDate ?? undefined,
    });
    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
