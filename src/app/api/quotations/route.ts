import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { quotationCreateSchema } from "@/lib/validation";
import { createQuotation, QUOTATION_INCLUDE } from "@/lib/quotation-service";
import { quotationTotals } from "@/lib/quotation-calculations";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const quotations = await db.quotation.findMany({
      where: {
        organisationId: user.organisationId,
        ...(q ? { OR: [{ quoteNumber: { contains: q } }, { clientName: { contains: q } }, { propertyAddress: { contains: q } }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: QUOTATION_INCLUDE,
    });
    return NextResponse.json(quotations.map((quotation) => ({
      ...quotation,
      complexityFactors: JSON.parse(quotation.complexityFactors || "[]"),
      totals: quotationTotals(quotation.lineItems, quotation.discountAmount, quotation.vatRatePercent, quotation.pricesIncludeVat),
    })));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const input = quotationCreateSchema.parse(await req.json());
    const quotation = await createQuotation({ organisationId: user.organisationId, createdById: user.id, input });
    return NextResponse.json({ ...quotation, complexityFactors: JSON.parse(quotation.complexityFactors || "[]") }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
