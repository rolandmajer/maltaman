import { NextRequest, NextResponse } from "next/server";
import { requireQuotationAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { quotationUpdateSchema } from "@/lib/validation";
import { QUOTATION_INCLUDE, updateQuotation } from "@/lib/quotation-service";
import { quotationTotals } from "@/lib/quotation-calculations";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireQuotationAccess(id, user.organisationId);
    const quotation = await db.quotation.findUniqueOrThrow({ where: { id }, include: QUOTATION_INCLUDE });
    return NextResponse.json({ ...quotation, complexityFactors: JSON.parse(quotation.complexityFactors || "[]"), totals: quotationTotals(quotation.lineItems, quotation.discountAmount, quotation.vatRatePercent, quotation.pricesIncludeVat) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireQuotationAccess(id, user.organisationId);
    const input = quotationUpdateSchema.parse(await req.json());
    const quotation = await updateQuotation(id, user.organisationId, input);
    return NextResponse.json(quotation);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    const quotation = await requireQuotationAccess(id, user.organisationId);
    if (quotation.status === "ACCEPTED" || quotation.status === "CONVERTED") {
      return NextResponse.json({ error: "Prijatú alebo prevedenú cenovú ponuku nie je možné vymazať" }, { status: 409 });
    }
    await db.quotation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
