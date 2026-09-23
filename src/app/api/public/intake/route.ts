import { NextRequest, NextResponse } from "next/server";
import { ApiError, jsonError } from "@/lib/api-helpers";
import { createLead, resolveCrmOrganisationId, upsertCustomer } from "@/lib/crm";
import { DEFAULT_QUOTE_OPTIONAL_SERVICES } from "@/lib/quotation-calculations";
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
    const customer = await upsertCustomer({
      organisationId,
      email: input.email,
      name: input.name,
      phone: input.phone,
      consentAt: new Date(),
      consentSource: "MALTAMAN web - nezáväzný dopyt",
    });
    const propertyType = propertyTypeForWebsiteService(input.service);
    const allowedCodes = new Set(DEFAULT_QUOTE_OPTIONAL_SERVICES.map((service) => service.code));
    const normalizedOptionalCodes = input.optionalServices.map((code) => code === "THERMAL"
      ? propertyType === "HOUSE" ? "THERMAL_HOUSE" : "THERMAL_APARTMENT"
      : code);
    const requestedOptionalCodes = normalizedOptionalCodes.filter((code) => allowedCodes.has(code));
    if (input.service === "kontrola_ponuky" && !requestedOptionalCodes.includes("DOCUMENTS")) requestedOptionalCodes.push("DOCUMENTS");
    const lead = await createLead({
      organisationId,
      customerId: customer.id,
      source: "WEBSITE",
      externalId: `website:${input.intakeId}`,
      propertyAddress: input.location,
      propertyType,
      requestedService: input.service,
      floorAreaM2: input.floorAreaM2,
      requestedOptionalCodes,
      message: input.message,
    });
    return NextResponse.json({ accepted: true, leadId: lead.id }, { status: 201, headers: corsHeaders(origin) });
  } catch (error) {
    const response = jsonError(error);
    for (const [key, value] of Object.entries(corsHeaders(origin))) response.headers.set(key, value);
    return response;
  }
}
