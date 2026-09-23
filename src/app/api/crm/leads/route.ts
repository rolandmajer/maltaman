import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { leadSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { createLead, upsertCustomer } from "@/lib/crm";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const status = req.nextUrl.searchParams.get("status");
    const leads = await db.lead.findMany({
      where: {
        organisationId: user.organisationId,
        ...(status && status !== "ALL" ? { status: status as never } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: true,
        inspection: { select: { id: true, protocolNumber: true } },
        quotations: { select: { id: true, quoteNumber: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json(leads);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const data = leadSchema.parse(await req.json());
    let customerId = data.customerId;
    if (!customerId) {
      if (!data.email) throw new ApiError(400, "Vyberte klienta alebo zadajte e-mail");
      const customer = await upsertCustomer({
        organisationId: user.organisationId,
        email: data.email,
        name: data.name,
        phone: data.phone,
      });
      customerId = customer.id;
    } else {
      const customer = await db.customer.findFirst({
        where: { id: customerId, organisationId: user.organisationId },
        select: { id: true },
      });
      if (!customer) throw new ApiError(404, "Klient nebol nájdený");
    }

    const saved = await createLead({
      organisationId: user.organisationId,
      customerId,
      source: data.source ?? "MANUAL",
      propertyAddress: data.propertyAddress,
      propertyType: data.propertyType,
      requestedService: data.requestedService,
      floorAreaM2: data.floorAreaM2,
      requestedOptionalCodes: data.requestedOptionalCodes,
      message: data.message,
      nextActionAt: data.nextActionAt ?? undefined,
    });
    const lead = await db.lead.findUniqueOrThrow({
      where: { id: saved.id },
      include: {
        customer: true,
        inspection: { select: { id: true, protocolNumber: true } },
        quotations: { select: { id: true, quoteNumber: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
