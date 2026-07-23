"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, Download, FileText, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiGet, apiPost } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { Button } from "@/components/ui/button";
import { WIZARD_STEPS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ValidationSummary } from "@/lib/validation-summary";

export function StepExport() {
  const { inspection, refetch } = useInspectionContext();
  const router = useRouter();
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ValidationSummary>(`/api/inspections/${inspection.id}/validate`).then(setValidation).catch(() => undefined);
  }, [inspection]);

  const pdfUrl = `/api/inspections/${inspection.id}/pdf`;

  async function handleComplete() {
    setBusy("complete");
    try {
      await apiPost(`/api/inspections/${inspection.id}/complete`, {}, "Dokončenie obhliadky");
      toast.success("Obhliadka bola dokončená.");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dokončenie zlyhalo");
    } finally {
      setBusy(null);
    }
  }

  async function handleDuplicate() {
    setBusy("duplicate");
    try {
      const created = await apiPost<{ id: string }>(`/api/inspections/${inspection.id}/duplicate`, {}, "Duplikovanie obhliadky");
      toast.success("Obhliadka bola duplikovaná.");
      router.push(`/obhliadky/${created.id}/zakladne-udaje`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Duplikovanie zlyhalo");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevision() {
    setBusy("revision");
    try {
      const created = await apiPost<{ id: string }>(`/api/inspections/${inspection.id}/revision`, {}, "Nová revízia");
      toast.success("Bola vytvorená nová revízia obhliadky.");
      router.push(`/obhliadky/${created.id}/zakladne-udaje`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vytvorenie revízie zlyhalo");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <StepPageHeader title="Kontrola a export" description="Skontrolujte úplnosť protokolu a vygenerujte finálny PDF report." />

      <StepSection title="Kontrola úplnosti">
        {!validation ? (
          <p className="text-sm text-slate-400">Načítavam kontrolu…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {validation.blockers.length === 0 ? (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="size-4" /> Protokol spĺňa všetky nevyhnutné podmienky na dokončenie.
              </p>
            ) : (
              <div>
                <p className="mb-1 text-sm font-medium text-red-700">Pred dokončením je potrebné doplniť:</p>
                <ul className="space-y-1">
                  {validation.blockers.map((b) => (
                    <li key={b.code} className="flex items-center gap-2 text-sm text-red-700">
                      <AlertTriangle className="size-4 shrink-0" /> {b.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium text-amber-700">Odporúčania na doplnenie (nebránia uloženiu):</p>
                <ul className="space-y-1">
                  {validation.warnings.map((w) => (
                    <li key={w.code} className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertTriangle className="size-4 shrink-0" />
                      {w.message}
                      <span className="text-xs text-slate-400">
                        ({WIZARD_STEPS.find((s) => s.key === w.step)?.label})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {inspection.status === "DRAFT" ? (
            <Button onClick={handleComplete} disabled={!validation?.canComplete || busy === "complete"}>
              <CheckCircle2 /> {busy === "complete" ? "Dokončujem…" : "Dokončiť obhliadku"}
            </Button>
          ) : (
            <span className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="size-4" /> Obhliadka dokončená {inspection.completedAt ? formatDateTime(inspection.completedAt) : ""}
            </span>
          )}
        </div>
      </StepSection>

      <StepSection title="PDF report">
        <div className="flex flex-wrap gap-2">
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <FileText /> Náhľad PDF
            </Button>
          </a>
          <a href={`${pdfUrl}?download=1`}>
            <Button variant="outline">
              <Download /> Stiahnuť PDF
            </Button>
          </a>
          <Button variant="outline" onClick={() => window.open(pdfUrl, "_blank")?.print()}>
            <Printer /> Tlačiť
          </Button>
        </div>
      </StepSection>

      <StepSection title="Ďalšie akcie">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleDuplicate()} disabled={busy === "duplicate"}>
            <Copy /> Duplikovať obhliadku
          </Button>
          {inspection.status === "COMPLETED" && (
            <Button variant="outline" onClick={() => void handleRevision()} disabled={busy === "revision"}>
              <RefreshCw /> Otvoriť ako revíziu
            </Button>
          )}
        </div>
        {inspection.revisionNumber > 1 && (
          <p className="text-sm text-slate-500">Revízia č. {inspection.revisionNumber}</p>
        )}
        {inspection.reportRevisions.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">História revízií</p>
            <ul className="space-y-1 text-sm text-slate-500">
              {inspection.reportRevisions.map((r) => (
                <li key={r.id}>
                  Revízia č. {r.revisionNumber} — {formatDateTime(r.createdAt)} {r.note ? `— ${r.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </StepSection>
    </div>
  );
}
