import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { ApiError, jsonError } from "@/lib/api-helpers";
import { createClientFormToken, publicOrigin } from "@/lib/client-quotation-form";
import { createLead, resolveCrmOrganisationId, upsertCustomer } from "@/lib/crm";
import { db } from "@/lib/db";
import { createQuotation } from "@/lib/quotation-service";
import { isAllowedWebsiteOrigin, propertyTypeForWebsiteService, websiteIntakeSchema } from "@/lib/website-intake";

function corsHeaders(origin: string | null): Record<string, string> {
  return isAllowedWebsiteOrigin(origin)
    ? { "Access-Control-Allow-Origin": origin!, Vary: "Origin" }
    : { Vary: "Origin" };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isAllowedWebsiteOrigin(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    if (!isAllowedWebsiteOrigin(origin)) throw new ApiError(403, "Nepovolený zdroj dopytu");
    const input = websiteIntakeSchema.parse(await req.json());
    const organisationId = await resolveCrmOrganisationId();
    const createdBy = await db.user.findFirst({
      where: { organisationId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!createdBy) throw new ApiError(503, "Pre cenové ponuky nie je nastavený používateľ");

    const customer = await upsertCustomer({
      organisationId,
      email: input.email,
      name: input.name,
      phone: input.phone,
      consentAt: new Date(),
      consentSource: "MALTAMAN web - cenová ponuka",
    });
    const propertyType = propertyTypeForWebsiteService(input.service);
    const lead = await createLead({
      organisationId,
      customerId: customer.id,
      source: "WEBSITE",
      externalId: `website:${input.intakeId}`,
      propertyAddress: input.location,
      propertyType,
      message: input.message,
    });

    const existing = await db.quotation.findFirst({
      where: { organisationId, leadId: lead.id },
      orderBy: { createdAt: "desc" },
    });
    const quotation = existing ?? await createQuotation({
      organisationId,
      createdById: createdBy.id,
      input: {
        customerId: customer.id,
        leadId: lead.id,
        clientName: input.name,
        clientEmail: input.email,
        clientPhone: input.phone,
        propertyAddress: input.location,
        propertyType,
        floorAreaM2: 0,
        notes: input.message,
      },
    });

    const { token, hash } = createClientFormToken();
    await db.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "AWAITING_SELECTION",
        clientFormTokenHash: hash,
        clientFormExpiresAt: addDays(new Date(), 14),
        clientFormSentAt: new Date(),
        clientFormSubmittedAt: null,
      },
    });
    const url = `${publicOrigin(req.headers, req.nextUrl.origin)}/ponuka/${token}`;
    return NextResponse.json({ accepted: true, url }, { status: 201, headers: corsHeaders(origin) });
  } catch (error) {
    const response = jsonError(error);
    for (const [key, value] of Object.entries(corsHeaders(origin))) response.headers.set(key, value);
    return response;
  }
}
