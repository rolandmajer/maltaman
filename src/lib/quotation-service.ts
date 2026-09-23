import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { AppSettingsModel } from "@/generated/prisma/models/AppSettings";
import type { QuotationStatus } from "@/generated/prisma/enums";
import { createInspection } from "@/lib/inspection-service";
import {
  baseInspectionPrice,
  complexityPercentFor,
  COMPLEXITY_FACTORS,
  DEFAULT_QUOTE_OPTIONAL_SERVICES,
  optionalServicePrice,
  roundMoney,
  travelPrice,
  type PropertyPricingType,
  type QuoteOptionalServicePreset,
  type QuotationLine,
} from "@/lib/quotation-calculations";

export const QUOTATION_INCLUDE = {
  lineItems: { orderBy: { order: "asc" as const } },
  customer: { select: { id: true, name: true, email: true, phone: true } },
  lead: { select: { id: true, status: true } },
  inspection: { select: { id: true, protocolNumber: true } },
  createdBy: { select: { id: true, name: true, registrationNumber: true } },
} as const;

export type QuotationInput = {
  customerId?: string | null;
  leadId?: string | null;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  propertyAddress?: string;
  propertyType?: PropertyPricingType;
  floorAreaM2?: number;
  baseRatePerM2?: number;
  floors?: number;
  complexityFactors?: string[];
  oneWayDistanceKm?: number;
  distanceManual?: boolean;
  routeNote?: string;
  selectedOptionalCodes?: string[];
  discountAmount?: number;
  pricesIncludeVat?: boolean;
  notes?: string;
  terms?: string;
};

function safeServices(json: string | null | undefined, settings: { fullProtocolRatePerM2: number; fullProtocolMinimum: number }) {
  let services: QuoteOptionalServicePreset[] = [];
  try {
    services = JSON.parse(json || "[]") as QuoteOptionalServicePreset[];
  } catch {
    services = [];
  }
  const configured = services.length > 0 ? services : DEFAULT_QUOTE_OPTIONAL_SERVICES;
  // FULL_PROTOCOL is a contractual option and a dependency target for several services.
  // Keep it available even if an older/custom settings payload omitted it.
  const base = configured.some((service) => service.code === "FULL_PROTOCOL")
    ? configured
    : [DEFAULT_QUOTE_OPTIONAL_SERVICES[0], ...configured];
  return base.map((service) => service.code === "FULL_PROTOCOL"
    ? { ...service, price: settings.fullProtocolRatePerM2, minimumPrice: settings.fullProtocolMinimum }
    : service);
}

function rateFor(type: PropertyPricingType, settings: {
  apartmentRatePerM2: number; apartmentMinimumPrice: number;
  houseRatePerM2: number; houseMinimumPrice: number;
  otherRatePerM2: number; otherMinimumPrice: number;
  shellRatePerM2: number; shellMinimumPrice: number;
}) {
  if (type === "HOUSE") return { rate: settings.houseRatePerM2, minimum: settings.houseMinimumPrice, label: "Obhliadka rodinného domu" };
  if (type === "OTHER") return { rate: settings.otherRatePerM2, minimum: settings.otherMinimumPrice, label: "Obhliadka inej nehnuteľnosti" };
  if (type === "SHELL") return { rate: settings.shellRatePerM2, minimum: settings.shellMinimumPrice, label: "Obhliadka novostavby / holostavby" };
  return { rate: settings.apartmentRatePerM2, minimum: settings.apartmentMinimumPrice, label: "Obhliadka bytu" };
}

function selectedWithDependencies(codes: string[], services: QuoteOptionalServicePreset[]) {
  const selected = new Set(codes);
  if (services.some((service) => service.requiresFullProtocol && selected.has(service.code))) selected.add("FULL_PROTOCOL");
  return selected;
}

function buildLines(input: Required<Pick<QuotationInput, "propertyType" | "floorAreaM2" | "complexityFactors" | "oneWayDistanceKm" | "selectedOptionalCodes">> & Pick<QuotationInput, "baseRatePerM2">, settings: AppSettingsModel) {
  const configuredPricing = rateFor(input.propertyType, settings);
  const pricing = { ...configuredPricing, rate: input.baseRatePerM2 ?? configuredPricing.rate };
  const base = baseInspectionPrice(input.floorAreaM2, pricing.rate, pricing.minimum);
  const complexityPercent = complexityPercentFor(input.complexityFactors);
  const returnDistanceKm = roundMoney(input.oneWayDistanceKm * 2);
  const travel = travelPrice(returnDistanceKm, {
    freeUpToKm: settings.travelFreeUpToKm,
    bandTwoUpToKm: settings.travelBandTwoUpToKm,
    bandTwoPrice: settings.travelBandTwoPrice,
    bandThreeUpToKm: settings.travelBandThreeUpToKm,
    bandThreePrice: settings.travelBandThreePrice,
    overBandRatePerKm: settings.travelOverBandRatePerKm,
  });
  const factors = COMPLEXITY_FACTORS.filter((factor) => input.complexityFactors.includes(factor.code));
  const services = safeServices(settings.quoteOptionalServices, settings);
  const selected = selectedWithDependencies(input.selectedOptionalCodes, services);
  const lines: QuotationLine[] = [
    { kind: "REQUIRED", code: "BASE_INSPECTION", name: pricing.label, description: `${input.floorAreaM2} m² × ${pricing.rate.toFixed(2)} €/m²; minimálna cena ${pricing.minimum.toFixed(2)} €`, quantity: 1, unit: "paušál", unitPrice: base, selected: true, order: 0 },
  ];
  if (complexityPercent > 0) {
    lines.push({ kind: "REQUIRED", code: "COMPLEXITY", name: "Príplatok za náročnosť", description: factors.map((f) => `${f.label} (+${f.percent} %)` ).join(", ") + (factors.reduce((sum, f) => sum + f.percent, 0) > 40 ? "; príplatok zastropovaný na 40 %" : ""), quantity: 1, unit: "paušál", unitPrice: roundMoney(base * complexityPercent / 100), selected: true, order: 1 });
  }
  lines.push({ kind: "REQUIRED", code: "TRAVEL", name: "Cestovné", description: `${returnDistanceKm.toFixed(1)} km tam aj späť z adresy ${settings.pricingBaseAddress}`, quantity: 1, unit: "paušál", unitPrice: travel, selected: true, order: 2 });
  services.forEach((service, index) => lines.push({
    kind: "OPTIONAL",
    code: service.code,
    name: service.name,
    description: service.description,
    quantity: 1,
    unit: service.pricingMode === "PER_M2" ? `${input.floorAreaM2} m²` : "paušál",
    unitPrice: optionalServicePrice(service, input.floorAreaM2),
    selected: selected.has(service.code),
    order: 100 + index,
  }));
  return { lines, pricing, complexityPercent, returnDistanceKm, travel, services };
}

async function nextQuoteNumber(organisationId: string, prefix: string) {
  const year = new Date().getFullYear();
  const count = await db.quotation.count({ where: { organisationId, quoteNumber: { startsWith: `${prefix}-${year}-` } } });
  for (let offset = 1; offset < 10; offset++) {
    const candidate = `${prefix}-${year}-${String(count + offset).padStart(3, "0")}`;
    const exists = await db.quotation.findUnique({ where: { organisationId_quoteNumber: { organisationId, quoteNumber: candidate } } });
    if (!exists) return candidate;
  }
  return `${prefix}-${year}-${Date.now() % 100000}`;
}

export async function createQuotation(params: { organisationId: string; createdById: string; input: QuotationInput }) {
  const settings = await db.appSettings.findUniqueOrThrow({ where: { organisationId: params.organisationId } });
  const customer = params.input.customerId ? await db.customer.findFirst({ where: { id: params.input.customerId, organisationId: params.organisationId } }) : null;
  if (params.input.customerId && !customer) throw new ApiError(400, "Vybraný klient nepatrí do tejto organizácie");
  if (params.input.leadId) {
    const lead = await db.lead.findFirst({ where: { id: params.input.leadId, organisationId: params.organisationId } });
    if (!lead) throw new ApiError(400, "Vybraný dopyt nepatrí do tejto organizácie");
  }
  const type = params.input.propertyType ?? "APARTMENT";
  const area = params.input.floorAreaM2 ?? 0;
  const complexityFactors = params.input.complexityFactors ?? [];
  const selectedOptionalCodes = params.input.selectedOptionalCodes ?? [];
  const built = buildLines({ propertyType: type, floorAreaM2: area, baseRatePerM2: params.input.baseRatePerM2, complexityFactors, oneWayDistanceKm: params.input.oneWayDistanceKm ?? 0, selectedOptionalCodes }, settings);
  const quoteNumber = await nextQuoteNumber(params.organisationId, settings.quoteNumberPrefix);
  return db.quotation.create({
    data: {
      organisationId: params.organisationId,
      createdById: params.createdById,
      customerId: customer?.id,
      leadId: params.input.leadId,
      quoteNumber,
      validUntil: addDays(new Date(), settings.quoteValidityDays),
      clientName: params.input.clientName ?? customer?.name ?? "",
      clientEmail: params.input.clientEmail ?? customer?.email ?? "",
      clientPhone: params.input.clientPhone ?? customer?.phone ?? "",
      propertyAddress: params.input.propertyAddress ?? "",
      propertyType: type,
      floorAreaM2: area,
      floors: params.input.floors ?? 1,
      baseRatePerM2: built.pricing.rate,
      minimumPrice: built.pricing.minimum,
      furnishingLevel: complexityFactors.includes("FURNITURE_MOVEMENT") ? "MOVEMENT" : complexityFactors.includes("HEAVILY_FURNISHED") ? "HEAVY" : "NORMAL",
      complexityFactors: JSON.stringify(complexityFactors),
      complexityPercent: built.complexityPercent,
      complexityDescription: built.lines.find((line) => line.code === "COMPLEXITY")?.description ?? "",
      routeOrigin: settings.pricingBaseAddress,
      oneWayDistanceKm: params.input.oneWayDistanceKm ?? 0,
      returnDistanceKm: built.returnDistanceKm,
      travelCharge: built.travel,
      distanceManual: params.input.distanceManual ?? false,
      routeNote: params.input.routeNote ?? "",
      discountAmount: params.input.discountAmount ?? 0,
      vatRatePercent: settings.defaultVatRatePercent,
      pricesIncludeVat: params.input.pricesIncludeVat ?? true,
      notes: params.input.notes ?? "",
      terms: params.input.terms,
      lineItems: { create: built.lines },
    },
    include: QUOTATION_INCLUDE,
  });
}

export async function updateQuotation(quotationId: string, organisationId: string, input: QuotationInput & { status?: QuotationStatus }) {
  const existing = await db.quotation.findFirst({ where: { id: quotationId, organisationId }, include: { lineItems: true } });
  if (!existing) return null;
  if (existing.status === "ACCEPTED" || existing.status === "CONVERTED") {
    throw new ApiError(409, "Prijatú alebo prevedenú cenovú ponuku už nie je možné meniť");
  }
  if (input.status === "CONVERTED") {
    throw new ApiError(400, "Ponuku možno previesť iba vytvorením obhliadky");
  }

  const isStatusOnly = Object.keys(input).every((key) => key === "status");
  if (isStatusOnly && input.status) {
    return db.quotation.update({
      where: { id: quotationId },
      data: {
        status: input.status,
        acceptedAt: input.status === "ACCEPTED" ? new Date() : existing.acceptedAt,
      },
      include: QUOTATION_INCLUDE,
    });
  }

  if (input.customerId) {
    const customer = await db.customer.findFirst({ where: { id: input.customerId, organisationId } });
    if (!customer) throw new ApiError(400, "Vybraný klient nepatrí do tejto organizácie");
  }
  if (input.leadId) {
    const lead = await db.lead.findFirst({ where: { id: input.leadId, organisationId } });
    if (!lead) throw new ApiError(400, "Vybraný dopyt nepatrí do tejto organizácie");
  }
  const settings = await db.appSettings.findUniqueOrThrow({ where: { organisationId } });
  const propertyType = (input.propertyType ?? existing.propertyType) as PropertyPricingType;
  const floorAreaM2 = input.floorAreaM2 ?? existing.floorAreaM2;
  const baseRatePerM2 = input.baseRatePerM2 ?? existing.baseRatePerM2;
  const complexityFactors = input.complexityFactors ?? (JSON.parse(existing.complexityFactors || "[]") as string[]);
  const selectedOptionalCodes = input.selectedOptionalCodes ?? existing.lineItems.filter((line) => line.kind === "OPTIONAL" && line.selected).map((line) => line.code);
  const oneWayDistanceKm = input.oneWayDistanceKm ?? existing.oneWayDistanceKm;
  const built = buildLines({ propertyType, floorAreaM2, baseRatePerM2, complexityFactors, oneWayDistanceKm, selectedOptionalCodes }, settings);
  await db.$transaction(async (tx) => {
    await tx.quotationLineItem.deleteMany({ where: { quotationId } });
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        customerId: input.customerId === undefined ? existing.customerId : input.customerId,
        leadId: input.leadId === undefined ? existing.leadId : input.leadId,
        clientName: input.clientName ?? existing.clientName,
        clientEmail: input.clientEmail ?? existing.clientEmail,
        clientPhone: input.clientPhone ?? existing.clientPhone,
        propertyAddress: input.propertyAddress ?? existing.propertyAddress,
        propertyType,
        floorAreaM2,
        floors: input.floors ?? existing.floors,
        baseRatePerM2: built.pricing.rate,
        minimumPrice: built.pricing.minimum,
        furnishingLevel: complexityFactors.includes("FURNITURE_MOVEMENT") ? "MOVEMENT" : complexityFactors.includes("HEAVILY_FURNISHED") ? "HEAVY" : "NORMAL",
        complexityFactors: JSON.stringify(complexityFactors),
        complexityPercent: built.complexityPercent,
        complexityDescription: built.lines.find((line) => line.code === "COMPLEXITY")?.description ?? "",
        routeOrigin: settings.pricingBaseAddress,
        oneWayDistanceKm,
        returnDistanceKm: built.returnDistanceKm,
        travelCharge: built.travel,
        distanceManual: input.distanceManual ?? existing.distanceManual,
        routeNote: input.routeNote ?? existing.routeNote,
        discountAmount: input.discountAmount ?? existing.discountAmount,
        pricesIncludeVat: input.pricesIncludeVat ?? existing.pricesIncludeVat,
        notes: input.notes ?? existing.notes,
        terms: input.terms ?? existing.terms,
        status: input.status,
        acceptedAt: input.status === "ACCEPTED" ? new Date() : existing.acceptedAt,
        lineItems: { create: built.lines },
      },
    });
  });
  return db.quotation.findUnique({ where: { id: quotationId }, include: QUOTATION_INCLUDE });
}

export async function convertQuotationToInspection(quotationId: string, organisationId: string, createdById: string) {
  const quote = await db.quotation.findFirst({ where: { id: quotationId, organisationId }, include: { lineItems: true } });
  if (!quote) return null;
  if (quote.inspectionId) return db.inspection.findUnique({ where: { id: quote.inspectionId } });
  if (quote.status !== "ACCEPTED") throw new ApiError(409, "Obhliadku možno vytvoriť až po prijatí cenovej ponuky klientom");
  const inspection = await createInspection({
    organisationId,
    createdById,
    propertyType: quote.propertyType,
    purpose: "Technická obhliadka podľa cenovej ponuky",
  });
  await db.$transaction([
    db.inspection.update({ where: { id: inspection.id }, data: { customerId: quote.customerId, generalNote: `Cenová ponuka ${quote.quoteNumber}` } }),
    db.property.update({ where: { inspectionId: inspection.id }, data: { address: quote.propertyAddress, totalFloorAreaM2: quote.floorAreaM2, ownerName: quote.clientName, ownerContact: [quote.clientEmail, quote.clientPhone].filter(Boolean).join(", ") } }),
    db.quotation.update({ where: { id: quote.id }, data: { inspectionId: inspection.id, status: "CONVERTED", acceptedAt: quote.acceptedAt ?? new Date() } }),
  ]);
  return db.inspection.findUnique({ where: { id: inspection.id } });
}
