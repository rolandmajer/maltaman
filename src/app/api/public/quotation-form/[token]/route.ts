import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, ApiError } from "@/lib/api-helpers";
import { hashClientFormToken } from "@/lib/client-quotation-form";
import { COMPLEXITY_FACTORS, DEFAULT_QUOTE_OPTIONAL_SERVICES } from "@/lib/quotation-calculations";
import { updateQuotation } from "@/lib/quotation-service";
import { roadDistance } from "@/lib/route-distance";

const submissionSchema = z.object({
  clientName: z.string().trim().min(2, "Zadajte meno a priezvisko"),
  clientEmail: z.string().trim().email("Zadajte platný e-mail"),
  clientPhone: z.string().trim().min(6, "Zadajte telefónne číslo"),
  propertyAddress: z.string().trim().min(5, "Zadajte úplnú adresu nehnuteľnosti"),
  propertyType: z.enum(["APARTMENT", "HOUSE", "SHELL", "OTHER"]),
  floorAreaM2: z.coerce.number().positive("Zadajte podlahovú plochu"),
  floors: z.coerce.number().int().min(1).max(20),
  complexityFactors: z.array(z.string()).max(10),
  selectedOptionalCodes: z.array(z.string()).max(30),
  notes: z.string().trim().max(2000).default(""),
});

async function quotationForToken(token: string) {
  const quote = await db.quotation.findUnique({
    where: { clientFormTokenHash: hashClientFormToken(token) },
    include: { lineItems: { orderBy: { order: "asc" } } },
  });
  if (!quote || !quote.clientFormExpiresAt || quote.clientFormExpiresAt < new Date()) {
    throw new ApiError(404, "Tento odkaz už nie je platný");
  }
  return quote;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const quote = await quotationForToken(token);
    const optionalServices = quote.lineItems.filter((line) => line.kind === "OPTIONAL").map((line) => ({
      code: line.code,
      name: line.name,
      description: line.description,
      requiresFullProtocol: DEFAULT_QUOTE_OPTIONAL_SERVICES.find((service) => service.code === line.code)?.requiresFullProtocol ?? false,
    }));
    return NextResponse.json({
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientPhone: quote.clientPhone,
      propertyAddress: quote.propertyAddress,
      propertyType: quote.propertyType,
      floorAreaM2: quote.floorAreaM2,
      floors: quote.floors,
      complexityFactors: JSON.parse(quote.complexityFactors || "[]"),
      selectedOptionalCodes: quote.lineItems.filter((line) => line.kind === "OPTIONAL" && line.selected).map((line) => line.code),
      notes: quote.notes,
      optionalServices,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const quote = await quotationForToken(token);
    const input = submissionSchema.parse(await req.json());
    const allowedCodes = new Set(quote.lineItems.filter((line) => line.kind === "OPTIONAL").map((line) => line.code));
    const selectedOptionalCodes = input.selectedOptionalCodes.filter((code) => allowedCodes.has(code));
    const allowedFactors = new Set<string>(COMPLEXITY_FACTORS.map((factor) => factor.code));
    const complexityFactors = input.complexityFactors.filter((code) => allowedFactors.has(code));
    if (input.floors > 2 && !complexityFactors.includes("MULTI_FLOOR")) complexityFactors.push("MULTI_FLOOR");

    const settings = await db.appSettings.findUniqueOrThrow({ where: { organisationId: quote.organisationId } });
    let oneWayDistanceKm = quote.oneWayDistanceKm;
    let routeNote = "Trasu treba skontrolovať technikom.";
    try {
      const route = await roadDistance(settings.pricingBaseAddress, input.propertyAddress);
      oneWayDistanceKm = route.oneWayDistanceKm;
      routeNote = `${route.originLabel} → ${route.destinationLabel}`;
    } catch {
      // A routing outage must not lose a completed client questionnaire.
    }

    await updateQuotation(quote.id, quote.organisationId, {
      ...input,
      complexityFactors,
      selectedOptionalCodes,
      oneWayDistanceKm,
      distanceManual: false,
      routeNote,
      status: "CLIENT_SELECTED",
    });
    await db.quotation.update({
      where: { id: quote.id },
      data: { clientFormSubmittedAt: new Date(), clientFormTokenHash: null, clientFormExpiresAt: null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
