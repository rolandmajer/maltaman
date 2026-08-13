import { NextResponse } from "next/server";
import { ApiError, jsonError } from "@/lib/api-helpers";
import { createLead, resolveCrmOrganisationId, upsertCustomer } from "@/lib/crm";
import { parseNetlifyChecklistPayload, verifyNetlifyWebhook } from "@/lib/netlify-webhook";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const secret = process.env.NETLIFY_WEBHOOK_SECRET?.trim() ?? "";
    if (!verifyNetlifyWebhook(req.headers.get("x-webhook-signature"), rawBody, secret)) {
      throw new ApiError(401, "Neplatný podpis webhooku");
    }

    const data = parseNetlifyChecklistPayload(JSON.parse(rawBody));
    if (!data.email) throw new ApiError(400, "Webhook neobsahuje e-mail");

    const organisationId = await resolveCrmOrganisationId();
    const customer = await upsertCustomer({
      organisationId,
      email: data.email,
      name: data.name,
      phone: data.phone,
      consentAt: new Date(),
      consentSource: "MALTAMAN checklist",
    });
    const lead = await createLead({
      organisationId,
      customerId: customer.id,
      source: "CHECKLIST",
      externalId: data.externalId || undefined,
      propertyAddress: data.propertyAddress,
      propertyType: data.propertyType,
      message: data.message || "Stiahnutie checklistu z webovej stránky",
    });

    return NextResponse.json({ accepted: true, leadId: lead.id });
  } catch (error) {
    return jsonError(error);
  }
}
