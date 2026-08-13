import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppHeader } from "@/components/app-header";
import { CustomersClient, type CustomerDto } from "./customers-client";

export default async function CustomersPage() {
  const session = await auth();
  const customers = await db.customer.findMany({
    where: { organisationId: session!.user.organisationId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { leads: true, inspections: true } } },
  });
  const dto: CustomerDto[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    notes: customer.notes,
    consentAt: customer.consentAt?.toISOString() ?? null,
    leadCount: customer._count.leads,
    inspectionCount: customer._count.inspections,
  }));

  return (
    <>
      <AppHeader userName={session!.user.name ?? ""} />
      <CustomersClient initialCustomers={dto} />
    </>
  );
}
