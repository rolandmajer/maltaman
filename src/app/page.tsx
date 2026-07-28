import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeCostItem } from "@/lib/calculations";
import { AppHeader } from "@/components/app-header";
import { DashboardClient } from "./dashboard-client";
import type { InspectionListItem } from "@/types/inspection";

export default async function DashboardPage() {
  const session = await auth();
  const organisationId = session!.user.organisationId;

  const inspections = await db.inspection.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    include: {
      property: true,
      rooms: { select: { id: true, elements: { select: { status: true } } } },
      findings: { select: { id: true, status: true } },
      costItems: {
        select: {
          included: true,
          quantity: true,
          unitPrice: true,
          laborCost: true,
          materialCost: true,
          otherCost: true,
          vatRatePercent: true,
        },
      },
    },
  });

  const withTotals: InspectionListItem[] = inspections.map((inspection) => {
    const totalInclVat = inspection.costItems
      .filter((i) => i.included)
      .reduce((sum, i) => sum + computeCostItem(i, inspection.costsEnteredInclVat).priceInclVat, 0);
    const { costItems, ...rest } = inspection;
    void costItems;
    return { ...rest, costTotalInclVat: Math.round(totalInclVat * 100) / 100 };
  });

  return (
    <>
      <AppHeader userName={session!.user.name ?? ""} />
      <DashboardClient initialInspections={withTotals} />
    </>
  );
}
