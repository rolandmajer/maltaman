"use client";

import { Plus, User } from "lucide-react";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { InlineTextField, InlineTextAreaField } from "@/components/wizard/inline-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import type { FullInspection, FullParticipant } from "@/types/inspection";
import { parseDecimal } from "@/lib/format";

export function StepUcastnici() {
  const { inspection, applyAndSave, create } = useInspectionContext();

  function updateParticipant(id: string, patch: Partial<FullParticipant>) {
    void applyAndSave(
      (prev) => ({
        ...prev,
        participants: prev.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }),
      () => apiPatch(`/api/inspections/${inspection.id}/participants/${id}`, patch, "Účastník")
    );
  }

  function addParticipant() {
    void create(
      () =>
        apiPost<FullParticipant>(
          `/api/inspections/${inspection.id}/participants`,
          { fullName: "Nový účastník", order: inspection.participants.length },
          "Nový účastník"
        ),
      (prev, created) => ({ ...prev, participants: [...prev.participants, created] })
    );
  }

  function removeParticipant(id: string) {
    void applyAndSave(
      (prev) => ({ ...prev, participants: prev.participants.filter((p) => p.id !== id) }),
      () => apiDelete(`/api/inspections/${inspection.id}/participants/${id}`, "Odstránenie účastníka")
    );
  }

  function updateConditions(patch: Record<string, unknown>) {
    void applyAndSave(
      (prev) => ({ ...prev, conditions: { ...prev.conditions!, ...patch } }) as FullInspection,
      () => apiPatch(`/api/inspections/${inspection.id}/conditions`, patch, "Podmienky obhliadky")
    );
  }

  const conditions = inspection.conditions;

  return (
    <div>
      <StepPageHeader title="Účastníci a podmienky" description="Kto bol prítomný a za akých podmienok obhliadka prebehla." />

      <StepSection
        title="Účastníci obhliadky"
        actions={
          <Button size="sm" variant="outline" onClick={addParticipant}>
            <Plus /> Pridať účastníka
          </Button>
        }
      >
        {inspection.participants.length === 0 && (
          <p className="text-sm text-slate-400">Zatiaľ žiadni účastníci. Pridajte klienta, poradcu alebo ďalšie osoby.</p>
        )}
        <div className="flex flex-col gap-4">
          {inspection.participants.map((participant) => (
            <div key={participant.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <User className="size-4" /> Účastník
                </span>
                <ConfirmDeleteButton
                  onConfirm={() => removeParticipant(participant.id)}
                  title="Odstrániť účastníka?"
                  description={`Naozaj chcete odstrániť „${participant.fullName}“?`}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InlineTextField
                  label="Meno a priezvisko"
                  value={participant.fullName}
                  required
                  onCommit={(v) => updateParticipant(participant.id, { fullName: v })}
                />
                <InlineTextField
                  label="Organizácia"
                  value={participant.organisation}
                  onCommit={(v) => updateParticipant(participant.id, { organisation: v })}
                />
                <InlineTextField
                  label="Funkcia / vzťah k nehnuteľnosti"
                  value={participant.role}
                  onCommit={(v) => updateParticipant(participant.id, { role: v })}
                />
                <InlineTextField
                  label="Telefón"
                  value={participant.phone}
                  type="tel"
                  onCommit={(v) => updateParticipant(participant.id, { phone: v })}
                />
                <InlineTextField
                  label="E-mail"
                  value={participant.email}
                  type="email"
                  onCommit={(v) => updateParticipant(participant.id, { email: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <InlineTextField
                    label="Prítomný od"
                    value={participant.presentFrom}
                    type="time"
                    onCommit={(v) => updateParticipant(participant.id, { presentFrom: v })}
                  />
                  <InlineTextField
                    label="do"
                    value={participant.presentTo}
                    type="time"
                    onCommit={(v) => updateParticipant(participant.id, { presentTo: v })}
                  />
                </div>
                <InlineTextAreaField
                  label="Poznámka"
                  value={participant.note}
                  className="sm:col-span-2"
                  onCommit={(v) => updateParticipant(participant.id, { note: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </StepSection>

      <StepSection title="Podmienky obhliadky">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InlineTextField label="Počasie" value={conditions?.weather ?? ""} onCommit={(v) => updateConditions({ weather: v })} />
          <InlineTextField
            label="Vonkajšia teplota (°C)"
            type="number"
            value={String(conditions?.outdoorTemperatureC ?? "")}
            onCommit={(v) => updateConditions({ outdoorTemperatureC: parseDecimal(v) })}
          />
          <InlineTextField
            label="Obsadenosť nehnuteľnosti"
            value={conditions?.occupancy ?? ""}
            onCommit={(v) => updateConditions({ occupancy: v })}
          />
          <InlineTextField
            label="Prístupnosť priestorov"
            value={conditions?.accessibility ?? ""}
            onCommit={(v) => updateConditions({ accessibility: v })}
          />
          <InlineTextField label="Osvetlenie" value={conditions?.lighting ?? ""} onCommit={(v) => updateConditions({ lighting: v })} />
          <InlineTextField
            label="Stav zariadenia"
            value={conditions?.equipmentCondition ?? ""}
            onCommit={(v) => updateConditions({ equipmentCondition: v })}
          />
          <InlineTextAreaField
            label="Obmedzenia obhliadky / neprístupné časti"
            value={conditions?.limitations ?? ""}
            className="sm:col-span-2"
            onCommit={(v) => updateConditions({ limitations: v })}
          />
          <InlineTextField
            label="Použité meracie zariadenia"
            value={conditions?.measuringDevices ?? ""}
            className="sm:col-span-2"
            onCommit={(v) => updateConditions({ measuringDevices: v })}
          />
          <InlineTextAreaField
            label="Ďalšie poznámky"
            value={conditions?.notes ?? ""}
            className="sm:col-span-2"
            onCommit={(v) => updateConditions({ notes: v })}
          />
        </div>
      </StepSection>
    </div>
  );
}
