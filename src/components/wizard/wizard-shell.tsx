"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { WizardStepper } from "@/components/wizard/wizard-stepper";
import { Button } from "@/components/ui/button";
import { useInspectionContext } from "@/lib/inspection-context";
import { WIZARD_STEPS } from "@/lib/constants";
import { computeStepCompletion } from "@/lib/step-completion";
import { apiDelete } from "@/lib/offline/api-client";

export function WizardShell({ children, userName }: { children: ReactNode; userName: string }) {
  const { inspection } = useInspectionContext();
  const router = useRouter();
  const params = useParams<{ id: string; step: string }>();
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === params.step);
  const completion = computeStepCompletion(inspection);

  const prevStep = currentIndex > 0 ? WIZARD_STEPS[currentIndex - 1] : null;
  const nextStep = currentIndex >= 0 && currentIndex < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[currentIndex + 1] : null;

  async function deleteInspection() {
    try {
      await apiDelete(`/api/inspections/${inspection.id}`, "Odstránenie protokolu");
      toast.success("Protokol bol vymazaný");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Protokol sa nepodarilo vymazať");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader userName={userName} backHref="/" />
      <div className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-2 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-3 px-2">
            <p className="min-w-0 truncate text-sm font-medium text-slate-500">
              {inspection.protocolNumber}
              {inspection.property?.address ? ` · ${inspection.property.address}` : ""}
            </p>
            <ConfirmDeleteButton
              label="Vymazať protokol"
              title="Vymazať celý protokol?"
              description="Natrvalo sa odstráni protokol vrátane miestností, zistení, nákladov, fotografií a podpisov. Táto akcia sa nedá vrátiť späť."
              onConfirm={() => void deleteInspection()}
            />
          </div>
          <WizardStepper inspectionId={inspection.id} completion={completion} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28">{children}</main>

      {currentIndex >= 0 && (
        <div className="no-print sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
            <Button
              variant="outline"
              size="lg"
              disabled={!prevStep}
              onClick={() => prevStep && router.push(`/obhliadky/${inspection.id}/${prevStep.key}`)}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft /> Späť
            </Button>
            <span className="hidden text-sm text-slate-500 sm:inline">
              Krok {currentIndex + 1} z {WIZARD_STEPS.length}
            </span>
            <Button
              size="lg"
              disabled={!nextStep}
              onClick={() => nextStep && router.push(`/obhliadky/${inspection.id}/${nextStep.key}`)}
              className="flex-1 sm:flex-none"
            >
              Ďalej <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
