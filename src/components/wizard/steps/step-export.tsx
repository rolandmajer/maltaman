"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, Download, FileText, Mail, Printer, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiGet, apiPost } from "@/lib/offline/api-client";
import { clientEmailFor, reportEmailBody, reportEmailSubject, reportFileName, reportMailtoUrl } from "@/lib/share-report";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { Button } from "@/components/ui/button";
import { WIZARD_STEPS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ValidationSummary } from "@/lib/validation-summary";

/** The export actions that need the generated report in hand. */
type PdfAction = "preview" | "download" | "print" | "share" | "email";

// Static, at module scope: built inside the component it would be a fresh array of closures on
// every render, which the React compiler cannot tell apart from reading a ref during render.
const PDF_ACTIONS: { key: PdfAction; label: string; icon: typeof FileText }[] = [
  { key: "preview", label: "Náhľad PDF", icon: FileText },
  { key: "download", label: "Stiahnuť PDF", icon: Download },
  { key: "print", label: "Tlačiť", icon: Printer },
  { key: "email", label: "Poslať e-mailom", icon: Mail },
  { key: "share", label: "Zdieľať", icon: Share2 },
];
const PDF_ACTION_KEYS: string[] = PDF_ACTIONS.map((a) => a.key);

export function StepExport() {
  const { inspection, refetch } = useInspectionContext();
  const router = useRouter();
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ValidationSummary>(`/api/inspections/${inspection.id}/validate`).then(setValidation).catch(() => undefined);
  }, [inspection]);

  const pdfUrl = `/api/inspections/${inspection.id}/pdf`;

  /**
   * The generated report, held once so every action reuses it.
   *
   * Two reasons it is not fetched per action. Building it costs the server a real render, and
   * more importantly Safari only allows navigator.share() and window.open() while the tap that
   * triggered them is still "active" — an await in between expires that, so fetching first and
   * sharing after made Share and E-mail fail outright on iPhone. With the file already in hand
   * those calls happen synchronously inside the tap.
   */
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [armed, setArmed] = useState<PdfAction | null>(null);
  const objectUrls = useRef<string[]>([]);

  // A prepared report goes stale as soon as anything in the inspection changes. Adjusted during
  // render rather than in an effect: React re-runs the component immediately without committing
  // the stale file, so no pass ever shows "PDF je pripravené" for a report that no longer matches.
  const [preparedFor, setPreparedFor] = useState(inspection.updatedAt);
  if (preparedFor !== inspection.updatedAt) {
    setPreparedFor(inspection.updatedAt);
    setPdfFile(null);
    setArmed(null);
  }

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  /** Blob URL that outlives the call — revoking immediately can cancel an in-flight download. */
  function blobUrlFor(file: File): string {
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    return url;
  }

  const preparePdf = useCallback(async (): Promise<File> => {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error("Nepodarilo sa vygenerovať PDF");
    const file = new File([await res.blob()], reportFileName(inspection), { type: "application/pdf" });
    setPdfFile(file);
    return file;
  }, [pdfUrl, inspection]);

  function downloadFile(file: File) {
    const a = document.createElement("a");
    a.href = blobUrlFor(file);
    a.download = file.name;
    a.click();
  }

  /** True when the browser can hand the PDF to the native share sheet (mobile). */
  function canShareFiles(file: File): boolean {
    return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] });
  }

  function openInNewTab(file: File): boolean {
    // Must stay synchronous inside the tap, or Safari treats it as a blocked pop-up.
    const win = window.open(blobUrlFor(file), "_blank");
    return !!win;
  }

  function shareViaSheet(file: File, extra?: string) {
    // Deliberately not awaited before the call: navigator.share must be reached synchronously.
    navigator
      .share({ files: [file], title: reportEmailSubject(inspection), text: reportEmailBody(inspection) })
      .then(() => {
        if (extra) toast.info(extra, { duration: 10000 });
      })
      .catch((error: unknown) => {
        // Dismissing the share sheet without choosing a target is not a failure.
        if (error instanceof Error && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Zdieľanie zlyhalo");
      });
  }

  /**
   * Runs an action that needs the report. When it is already prepared the action runs immediately,
   * inside the tap, which is what Safari requires. Otherwise the first tap only builds the report
   * and arms the button, and the technician taps once more.
   */
  function withPdf(action: PdfAction, run: (file: File) => void) {
    if (pdfFile) {
      setArmed(null);
      run(pdfFile);
      return;
    }
    setBusy(action);
    setArmed(action);
    preparePdf()
      .then(() => toast.info("PDF je pripravené — ťuknite ešte raz.", { duration: 8000 }))
      .catch((error: unknown) => {
        setArmed(null);
        toast.error(error instanceof Error ? error.message : "Nepodarilo sa vygenerovať PDF");
      })
      .finally(() => setBusy(null));
  }

  function handlePreview() {
    withPdf("preview", (file) => {
      if (!openInNewTab(file)) toast.error("Prehliadač zablokoval otvorenie okna — použite Stiahnuť PDF.");
    });
  }

  // Downloading needs no active tap, so the first tap can build the report and save it in one go.
  function handleDownload() {
    if (pdfFile) {
      downloadFile(pdfFile);
      return;
    }
    setBusy("download");
    preparePdf()
      .then((file) => downloadFile(file))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Stiahnutie zlyhalo"))
      .finally(() => setBusy(null));
  }

  // A PDF opened in a tab is rendered by the browser's own viewer, which scripts cannot drive
  // reliably (and not at all on iOS). So this opens the report and leaves printing to the viewer.
  function handlePrint() {
    withPdf("print", (file) => {
      if (openInNewTab(file)) {
        toast.info("PDF je otvorené — vytlačte ho cez ponuku prehliadača.", { duration: 8000 });
      } else {
        toast.error("Prehliadač zablokoval otvorenie okna — použite Stiahnuť PDF.");
      }
    });
  }

  // Native share sheet with the PDF attached (Mail, WhatsApp, AirDrop, …). Falls back to a
  // plain download in browsers without the Web Share API (typically desktop).
  function handleShare() {
    withPdf("share", (file) => {
      if (canShareFiles(file)) {
        shareViaSheet(file);
      } else {
        downloadFile(file);
        toast.info("Tento prehliadač nepodporuje zdieľanie — PDF bolo stiahnuté.");
      }
    });
  }

  // E-mail to the client. A mailto: link cannot carry an attachment, so on mobile this opens the
  // share sheet with the PDF attached (choose Mail there); on desktop it downloads the PDF and
  // opens a prefilled draft.
  function handleEmail() {
    withPdf("email", (file) => {
      const clientEmail = clientEmailFor(inspection);
      if (canShareFiles(file)) {
        // Fired without awaiting, so the share sheet still opens inside this tap. The clipboard
        // write is best-effort and must not delay it.
        void navigator.clipboard?.writeText(clientEmail).catch(() => undefined);
        shareViaSheet(
          file,
          clientEmail ? `Adresa klienta ${clientEmail} je skopírovaná — vložte ju do poľa „Komu“.` : undefined
        );
      } else {
        downloadFile(file);
        window.location.href = reportMailtoUrl(inspection);
        toast.info("PDF bolo stiahnuté — priložte ho k pripravenému e-mailu.", { duration: 10000 });
      }
    });
  }

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

  function runPdfAction(action: PdfAction) {
    if (action === "preview") return handlePreview();
    if (action === "download") return handleDownload();
    if (action === "print") return handlePrint();
    if (action === "email") return handleEmail();
    return handleShare();
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
          {PDF_ACTIONS.map(({ key, label, icon: Icon }) => {
            const isBusy = busy === key;
            const isArmed = armed === key && !!pdfFile;
            return (
              <Button
                key={key}
                variant="outline"
                onClick={() => runPdfAction(key)}
                disabled={isBusy}
                aria-busy={isBusy}
              >
                <Icon /> {isBusy ? "Generujem PDF…" : isArmed ? `${label} — ťuknite znova` : label}
              </Button>
            );
          })}
        </div>
        {busy && PDF_ACTION_KEYS.includes(busy) && (
          <p className="text-sm text-slate-500">
            Generujem report. Ak aplikácia dlhšie nebola použitá, prvé spustenie môže trvať aj pol minúty.
          </p>
        )}
        {pdfFile && !busy && (
          <p className="text-sm text-slate-500">
            PDF je pripravené ({Math.round(pdfFile.size / 1024)} kB) — ďalšie akcie prebehnú okamžite.
          </p>
        )}
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
