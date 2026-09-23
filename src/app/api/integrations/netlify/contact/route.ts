import { NextResponse } from "next/server";
import { ApiError, jsonError } from "@/lib/api-helpers";
import { createLead, resolveCrmOrganisationId, upsertCustomer } from "@/lib/crm";
import { parseNetlifyContactPayload, verifyNetlifyWebhook } from "@/lib/netlify-webhook";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const secret = process.env.NETLIFY_WEBHOOK_SECRET?.trim() ?? "";
    if (!verifyNetlifyWebhook(req.headers.get("x-webhook-signature"), rawBody, secret)) {
      throw new ApiError(401, "Neplatný podpis webhooku");
    }

    const data = parseNetlifyContactPayload(JSON.parse(rawBody));
    const organisationId = await resolveCrmOrganisationId();
    const customer = await upsertCustomer({
      organisationId,
      email: data.email,
      name: data.name,
      phone: data.phone,
      consentAt: new Date(),
      consentSource: "MALTAMAN web - kontaktný formulár",
    });
    const lead = await createLead({
      organisationId,
      customerId: customer.id,
      source: "WEBSITE",
      externalId: data.externalId,
      propertyAddress: data.location,
      propertyType: data.propertyType,
      message: data.leadMessage,
    });

    return NextResponse.json({ accepted: true, leadId: lead.id });
  } catch (error) {
    return jsonError(error);
  }
}
