import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppHeader } from "@/components/app-header";
import { LeadsClient, type LeadDto } from "./leads-client";

export default async function LeadsPage() {
  const session = await auth();
  const organisationId = session!.user.organisationId;
  const leads = await db.lead.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: true,
      inspection: { select: { id: true, protocolNumber: true } },
      quotations: { select: { id: true, quoteNumber: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const dto: LeadDto[] = leads.map((lead) => ({
    id: lead.id,
    status: lead.status,
    source: lead.source,
    propertyAddress: lead.propertyAddress,
    propertyType: lead.propertyType,
    requestedService: lead.requestedService,
    floorAreaM2: lead.floorAreaM2,
    requestedOptionalCodes: JSON.parse(lead.requestedOptionalCodes || "[]"),
    message: lead.message,
    nextActionAt: lead.nextActionAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    customer: {
      id: lead.customer.id,
      name: lead.customer.name,
      email: lead.customer.email,
      phone: lead.customer.phone,
    },
    inspection: lead.inspection,
    quotation: lead.quotations[0] ?? null,
  }));

  return (
    <>
      <AppHeader userName={session!.user.name ?? ""} />
      <LeadsClient initialLeads={dto} />
    </>
  );
}
