import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { createInspection } from "@/lib/inspection-service";
import type { LeadSource } from "@/generated/prisma/enums";
import { inspectionClientCandidate } from "@/lib/inspection-client";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function syncInspectionCustomer(inspectionId: string, organisationId: string) {
  const inspection = await db.inspection.findFirst({
    where: { id: inspectionId, organisationId },
    select: {
      property: { select: { ownerName: true, ownerContact: true } },
      participants: { select: { fullName: true, role: true, email: true, phone: true }, orderBy: { order: "asc" } },
    },
  });
  if (!inspection) throw new ApiError(404, "Obhliadka nebola nájdená");

  const candidate = inspectionClientCandidate(inspection);
  if (!candidate) return null;

  const customer = await upsertCustomer({
    organisationId,
    email: candidate.email,
    name: candidate.name,
    phone: candidate.phone,
  });
  await db.inspection.update({ where: { id: inspectionId }, data: { customerId: customer.id } });
  return customer;
}

export async function upsertCustomer(params: {
  organisationId: string;
  email: string;
  name?: string;
  phone?: string;
  notes?: string;
  consentAt?: Date;
  consentSource?: string;
}) {
  const emailNormalized = normalizeEmail(params.email);
  if (!emailNormalized) throw new ApiError(400, "E-mail je povinný");

  return db.customer.upsert({
    where: {
      organisationId_emailNormalized: {
        organisationId: params.organisationId,
        emailNormalized,
      },
    },
    create: {
      organisationId: params.organisationId,
      email: params.email.trim(),
      emailNormalized,
      name: params.name?.trim() ?? "",
      phone: params.phone?.trim() ?? "",
      notes: params.notes?.trim() ?? "",
      consentAt: params.consentAt,
      consentSource: params.consentSource?.trim() ?? "",
    },
    update: {
      ...(params.name?.trim() ? { name: params.name.trim() } : {}),
      ...(params.phone?.trim() ? { phone: params.phone.trim() } : {}),
      ...(params.notes?.trim() ? { notes: params.notes.trim() } : {}),
      ...(params.consentAt ? { consentAt: params.consentAt } : {}),
      ...(params.consentSource?.trim() ? { consentSource: params.consentSource.trim() } : {}),
    },
  });
}

export async function createLead(params: {
  organisationId: string;
  customerId: string;
  source: LeadSource;
  propertyAddress?: string;
  propertyType?: string;
  message?: string;
  nextActionAt?: Date;
  externalId?: string;
}) {
  if (params.externalId) {
    const existing = await db.lead.findUnique({
      where: {
        organisationId_externalId: {
          organisationId: params.organisationId,
          externalId: params.externalId,
        },
      },
    });
    if (existing) return existing;
  }

  return db.lead.create({
    data: {
      organisationId: params.organisationId,
      customerId: params.customerId,
      source: params.source,
      propertyAddress: params.propertyAddress?.trim() ?? "",
      propertyType: params.propertyType?.trim() ?? "",
      message: params.message?.trim() ?? "",
      nextActionAt: params.nextActionAt,
      externalId: params.externalId,
    },
  });
}

export async function convertLeadToInspection(params: {
  leadId: string;
  organisationId: string;
  createdById: string;
}) {
  const lead = await db.lead.findFirst({
    where: { id: params.leadId, organisationId: params.organisationId },
    include: { customer: true },
  });
  if (!lead) throw new ApiError(404, "Lead nebol nájdený");
  if (lead.inspectionId) return { inspectionId: lead.inspectionId };

  const inspection = await createInspection({
    organisationId: params.organisationId,
    createdById: params.createdById,
    propertyType: lead.propertyType || undefined,
    purpose: "Obhliadka klienta z CRM",
  });

  await db.$transaction([
    db.inspection.update({
      where: { id: inspection.id },
      data: {
        customerId: lead.customerId,
        property: {
          update: {
            address: lead.propertyAddress,
            ownerName: lead.customer.name,
            ownerContact: [lead.customer.email, lead.customer.phone].filter(Boolean).join(", "),
          },
        },
      },
    }),
    db.lead.update({
      where: { id: lead.id },
      data: { inspectionId: inspection.id, status: "BOOKED" },
    }),
  ]);

  return { inspectionId: inspection.id };
}

export async function resolveCrmOrganisationId() {
  const configured = process.env.NETLIFY_CRM_ORGANISATION_ID?.trim();
  if (configured) {
    const organisation = await db.organisation.findUnique({ where: { id: configured } });
    if (!organisation) throw new ApiError(503, "CRM organizácia z konfigurácie neexistuje");
    return configured;
  }

  const organisations = await db.organisation.findMany({ select: { id: true }, take: 2 });
  if (organisations.length !== 1) {
    throw new ApiError(503, "Nastavte NETLIFY_CRM_ORGANISATION_ID");
  }
  return organisations[0].id;
}
