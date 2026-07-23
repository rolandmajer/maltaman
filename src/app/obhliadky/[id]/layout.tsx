import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFullInspection } from "@/lib/inspection-service";
import { InspectionProvider } from "@/lib/inspection-context";
import { WizardShell } from "@/components/wizard/wizard-shell";

export default async function InspectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const inspection = await getFullInspection(id);

  if (!inspection || inspection.organisationId !== session!.user.organisationId) {
    notFound();
  }

  return (
    <InspectionProvider initialInspection={inspection}>
      <WizardShell userName={session!.user.name ?? ""}>{children}</WizardShell>
    </InspectionProvider>
  );
}
