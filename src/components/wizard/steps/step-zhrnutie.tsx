"use client";

import { useMemo, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost } from "@/lib/offline/api-client";
import { useAutosaveForm } from "@/lib/use-autosave-form";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { SortableFindingCard } from "@/components/wizard/sortable-finding-card";
import { TextAreaField, SelectField } from "@/components/wizard/form-fields";
import { InlineTextAreaField } from "@/components/wizard/inline-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inspectionUpdateSchema } from "@/lib/validation";
import { FINDING_SEVERITY_LABELS, OVERALL_CONDITION_LABELS } from "@/lib/constants";
import type { z } from "zod";
import type { FullFinding, FullInspection } from "@/types/inspection";

type FormValues = z.infer<typeof inspectionUpdateSchema>;

export function StepZhrnutie() {
  const { inspection, applyAndSave, create } = useInspectionContext();
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const locationLabel = (finding: FullFinding) => {
    if (finding.roomId) return inspection.rooms.find((r) => r.id === finding.roomId)?.name ?? "";
    if (finding.elementId) {
      for (const cat of inspection.categories) {
        const el = cat.elements.find((e) => e.id === finding.elementId);
        if (el) return `${cat.name} · ${el.name}`;
      }
    }
    return "Všeobecné";
  };

  const defects = useMemo(
    () =>
      inspection.findings
        .filter((f) => f.status === "V" || f.status === "R")
        .filter((f) => severityFilter === "ALL" || f.severity === severityFilter)
        .filter((f) => roomFilter === "ALL" || f.roomId === roomFilter)
        .slice()
        .sort((a, b) => a.order - b.order),
    [inspection.findings, severityFilter, roomFilter]
  );

  const positives = inspection.findings.filter((f) => f.isPositiveObservation);

  function updateFinding(id: string, patch: Partial<FullFinding>) {
    void applyAndSave(
      (prev) => ({ ...prev, findings: prev.findings.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/findings/${id}`, patch, "Zistenie")
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = defects.findIndex((f) => f.id === active.id);
    const newIndex = defects.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(defects, oldIndex, newIndex);

    void applyAndSave(
      (prev) => {
        const orderMap = new Map(reordered.map((f, i) => [f.id, i]));
        return {
          ...prev,
          findings: prev.findings.map((f) => (orderMap.has(f.id) ? { ...f, order: orderMap.get(f.id)! } : f)),
        };
      },
      () =>
        Promise.all(
          reordered.map((f, i) => apiPatch(`/api/inspections/${inspection.id}/findings/${f.id}`, { order: i }))
        )
    );
  }

  async function addPositiveObservation() {
    await create(
      () =>
        apiPost<FullFinding>(
          `/api/inspections/${inspection.id}/findings`,
          { label: "Pozitívne zistenie", status: "OK", isPositiveObservation: true, includeInSummary: true },
          "Pozitívne zistenie"
        ),
      (prev, created) => ({ ...prev, findings: [...prev.findings, created] })
    );
  }

  const form = useAutosaveForm<FormValues>({
    schema: inspectionUpdateSchema,
    defaultValues: {
      overallConditionRating: inspection.overallConditionRating ?? undefined,
      mainRisks: inspection.mainRisks ?? "",
      immediateActions: inspection.immediateActions ?? "",
      followUpInspections: inspection.followUpInspections ?? "",
    },
    onSave: async (values) => {
      await applyAndSave(
        (prev) => ({ ...prev, ...values }) as FullInspection,
        () => apiPatch(`/api/inspections/${inspection.id}`, values, "Zhrnutie")
      );
    },
  });

  return (
    <div>
      <StepPageHeader
        title="Zhrnutie zistení"
        description="Zistenia sa zbierajú automaticky z miestností a technického stavu. Usporiadajte podľa dôležitosti."
      />

      <StepSection title="Celkové hodnotenie nehnuteľnosti">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            form={form}
            name="overallConditionRating"
            label="Celkový stav nehnuteľnosti"
            options={Object.entries(OVERALL_CONDITION_LABELS).map(([value, label]) => ({ value, label }))}
            allowEmpty
          />
        </div>
        <TextAreaField form={form} name="mainRisks" label="Hlavné riziká" />
        <TextAreaField form={form} name="immediateActions" label="Okamžité opatrenia" />
        <TextAreaField form={form} name="followUpInspections" label="Odporúčané ďalšie obhliadky / posúdenia" />
      </StepSection>

      <StepSection
        title={`Zistené vady a riziká (${defects.length})`}
        actions={
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Všetky závažnosti</SelectItem>
                {Object.entries(FINDING_SEVERITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Všetky miestnosti</SelectItem>
                {inspection.rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {defects.length === 0 ? (
          <p className="text-sm text-slate-400">Žiadne zistené vady zodpovedajúce filtru.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={defects.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {defects.map((finding) => (
                  <SortableFindingCard
                    key={finding.id}
                    finding={finding}
                    locationLabel={locationLabel(finding)}
                    onSeverityChange={(severity) => updateFinding(finding.id, { severity: severity as FullFinding["severity"] })}
                    onIncludeChange={(includeInSummary) => updateFinding(finding.id, { includeInSummary })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </StepSection>

      <StepSection
        title="Pozitívne zistenia"
        actions={
          <Button size="sm" variant="outline" onClick={() => void addPositiveObservation()}>
            <Plus /> Pridať
          </Button>
        }
      >
        {positives.length === 0 && <p className="text-sm text-slate-400">Žiadne pozitívne zistenia zatiaľ nepridané.</p>}
        <div className="flex flex-col gap-2">
          {positives.map((p) => (
            <InlineTextAreaField
              key={p.id}
              value={p.description}
              onCommit={(v) => updateFinding(p.id, { description: v })}
              placeholder="Popis pozitívneho zistenia…"
            />
          ))}
        </div>
      </StepSection>
    </div>
  );
}
