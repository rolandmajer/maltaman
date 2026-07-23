"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { InlineTextField } from "@/components/wizard/inline-field";
import { SignaturePad } from "@/components/wizard/signature-pad";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { SIGNATURE_ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { FullSignature } from "@/types/inspection";

type Settings = {
  legalVisualNonDestructive: string;
  legalNotAReplacement: string;
  legalHiddenDefects: string;
  legalLimitedByAccess: string;
  legalCostsIndicative: string;
  legalClientOnly: string;
  logoUrl: string | null;
  companyName: string;
};

export function StepVyhlasenie() {
  const { inspection, applyAndSave, create } = useInspectionContext();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    apiGet<Settings>("/api/settings").then(setSettings).catch(() => undefined);
  }, []);

  function updateSignature(id: string, patch: Partial<FullSignature>) {
    void applyAndSave(
      (prev) => ({ ...prev, signatures: prev.signatures.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/signatures/${id}`, patch, "Podpis")
    );
  }

  function deleteSignature(id: string) {
    void applyAndSave(
      (prev) => ({ ...prev, signatures: prev.signatures.filter((s) => s.id !== id) }),
      () => apiDelete(`/api/inspections/${inspection.id}/signatures/${id}`, "Odstránenie podpisu")
    );
  }

  async function addSignature(role: "TECHNICIAN" | "TECHNICIAN2" | "CLIENT") {
    await create(
      () =>
        apiPost<FullSignature>(
          `/api/inspections/${inspection.id}/signatures`,
          { role, fullName: "" },
          "Nový podpis"
        ),
      (prev, created) => ({ ...prev, signatures: [...prev.signatures, created] })
    );
  }

  const technician = inspection.signatures.find((s) => s.role === "TECHNICIAN");
  const technician2 = inspection.signatures.find((s) => s.role === "TECHNICIAN2");
  const client = inspection.signatures.find((s) => s.role === "CLIENT");

  return (
    <div>
      <StepPageHeader title="Vyhlásenie a podpisy" description="Právne vyhlásenia, obmedzenia obhliadky a podpisy zúčastnených strán." />

      <StepSection title="Vyhlásenie a obmedzenia">
        {settings ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>{settings.legalVisualNonDestructive}</li>
            <li>{settings.legalNotAReplacement}</li>
            <li>{settings.legalHiddenDefects}</li>
            <li>{settings.legalLimitedByAccess}</li>
            <li>{settings.legalCostsIndicative}</li>
            <li>{settings.legalClientOnly}</li>
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Načítavam znenie vyhlásenia…</p>
        )}
        <p className="text-xs text-slate-400">
          Znenie vyhlásenia je možné upraviť v <strong>Nastaveniach</strong> aplikácie.
        </p>
      </StepSection>

      {technician ? (
        <SignatureCard
          signature={technician}
          onUpdate={(patch) => updateSignature(technician.id, patch)}
          onDelete={() => deleteSignature(technician.id)}
          deletable={false}
        />
      ) : (
        <StepSection title={SIGNATURE_ROLE_LABELS.TECHNICIAN}>
          <Button size="sm" variant="outline" onClick={() => void addSignature("TECHNICIAN")} className="self-start">
            <Plus /> Pridať podpis poradcu
          </Button>
        </StepSection>
      )}

      {technician2 ? (
        <SignatureCard
          signature={technician2}
          onUpdate={(patch) => updateSignature(technician2.id, patch)}
          onDelete={() => deleteSignature(technician2.id)}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => void addSignature("TECHNICIAN2")} className="mb-4">
          <Plus /> Pridať druhého technika
        </Button>
      )}

      {client ? (
        <SignatureCard
          signature={client}
          onUpdate={(patch) => updateSignature(client.id, patch)}
          onDelete={() => deleteSignature(client.id)}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => void addSignature("CLIENT")} className="mb-4">
          <Plus /> Pridať potvrdenie klienta
        </Button>
      )}
    </div>
  );
}

function SignatureCard({
  signature,
  onUpdate,
  onDelete,
  deletable = true,
}: {
  signature: FullSignature;
  onUpdate: (patch: Partial<FullSignature>) => void;
  onDelete: () => void;
  deletable?: boolean;
}) {
  return (
    <StepSection
      title={SIGNATURE_ROLE_LABELS[signature.role]}
      actions={deletable ? <ConfirmDeleteButton onConfirm={onDelete} title="Odstrániť podpis?" /> : undefined}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InlineTextField label="Meno a priezvisko" value={signature.fullName} onCommit={(v) => onUpdate({ fullName: v })} />
        <InlineTextField
          label="Organizácia"
          value={signature.organisationName}
          onCommit={(v) => onUpdate({ organisationName: v })}
        />
        {signature.role !== "CLIENT" && (
          <InlineTextField
            label="Registračné / osvedčenie č."
            value={signature.registrationNumber}
            onCommit={(v) => onUpdate({ registrationNumber: v })}
          />
        )}
        <InlineTextField label="Miesto" value={signature.place} onCommit={(v) => onUpdate({ place: v })} />
        <InlineTextField
          label="Dátum podpisu"
          type="date"
          value={signature.signedAt ? new Date(signature.signedAt).toISOString().slice(0, 10) : ""}
          onCommit={(v) => onUpdate({ signedAt: v ? new Date(v) : null })}
        />
      </div>

      {signature.imageDataUrl ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signature.imageDataUrl} alt="Podpis" className="h-32 w-full rounded-lg border border-slate-200 bg-white object-contain" />
          <p className="text-xs text-slate-400">
            Podpísané {signature.signedAt ? formatDate(signature.signedAt) : ""}
          </p>
          <Button size="sm" variant="outline" onClick={() => onUpdate({ imageDataUrl: null })} className="self-start">
            Podpísať znova
          </Button>
        </div>
      ) : (
        <SignaturePad value={null} onSave={(dataUrl) => onUpdate({ imageDataUrl: dataUrl, signedAt: new Date() })} />
      )}
    </StepSection>
  );
}
