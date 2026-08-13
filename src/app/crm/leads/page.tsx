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
    },
  });

  const dto: LeadDto[] = leads.map((lead) => ({
    id: lead.id,
    status: lead.status,
    source: lead.source,
    propertyAddress: lead.propertyAddress,
    propertyType: lead.propertyType,
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
  }));

  return (
    <>
      <AppHeader userName={session!.user.name ?? ""} />
      <LeadsClient initialLeads={dto} />
    </>
  );
}
