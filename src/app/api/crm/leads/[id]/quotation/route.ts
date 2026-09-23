import { NextResponse } from "next/server";
import { ApiError, jsonError, requireSession } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { createQuotation } from "@/lib/quotation-service";
import type { PropertyPricingType } from "@/lib/quotation-calculations";

const PROPERTY_TYPES = new Set<PropertyPricingType>(["APARTMENT", "HOUSE", "SHELL", "OTHER"]);

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const lead = await db.lead.findFirst({
      where: { id, organisationId: user.organisationId },
      include: { customer: true, quotations: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!lead) throw new ApiError(404, "Lead nebol nájdený");
    if (lead.quotations[0]) return NextResponse.json({ quotationId: lead.quotations[0].id });

    const propertyType = PROPERTY_TYPES.has(lead.propertyType as PropertyPricingType)
      ? lead.propertyType as PropertyPricingType
      : "OTHER";
    let selectedOptionalCodes: string[] = [];
    try { selectedOptionalCodes = JSON.parse(lead.requestedOptionalCodes || "[]") as string[]; } catch { selectedOptionalCodes = []; }
    const fixedServicePrice = lead.requestedService === "rekonstrukcia" ? 99
      : lead.requestedService === "kontrola_ponuky" ? 49
      : undefined;
    const quotation = await createQuotation({
      organisationId: user.organisationId,
      createdById: user.id,
      input: {
        customerId: lead.customerId,
        leadId: lead.id,
        clientName: lead.customer.name,
        clientEmail: lead.customer.email,
        clientPhone: lead.customer.phone,
        propertyAddress: lead.propertyAddress,
        propertyType,
        floorAreaM2: lead.floorAreaM2,
        baseRatePerM2: fixedServicePrice === undefined ? undefined : 0,
        minimumPrice: fixedServicePrice,
        selectedOptionalCodes,
        notes: lead.message,
      },
    });
    await db.lead.update({ where: { id: lead.id }, data: { status: "QUALIFIED" } });
    return NextResponse.json({ quotationId: quotation.id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
