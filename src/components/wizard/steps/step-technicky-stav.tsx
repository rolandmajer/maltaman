"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { RoomChecklistRow } from "@/components/wizard/room-checklist-row";
import { InlineTextField } from "@/components/wizard/inline-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { patchFindingEverywhere } from "@/lib/finding-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FullCategory, FullElement, FullFinding } from "@/types/inspection";

export function StepTechnickyStav() {
  const { inspection, applyAndSave, create } = useInspectionContext();
  const categories = inspection.categories.slice().sort((a, b) => a.order - b.order);

  function updateFinding(findingId: string, patch: Partial<FullFinding>) {
    void applyAndSave(
      (prev) => patchFindingEverywhere(prev, findingId, patch),
      () => apiPatch(`/api/inspections/${inspection.id}/findings/${findingId}`, patch, "Technický prvok")
    );
  }

  function renameElement(categoryId: string, elementId: string, name: string) {
    void applyAndSave(
      (prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id !== categoryId ? c : { ...c, elements: c.elements.map((e) => (e.id === elementId ? { ...e, name } : e)) }
        ),
      }),
      () => apiPatch(`/api/inspections/${inspection.id}/elements/${elementId}`, { name }, "Názov prvku")
    );
  }

  function deleteElement(categoryId: string, elementId: string) {
    void applyAndSave(
      (prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id !== categoryId ? c : { ...c, elements: c.elements.filter((e) => e.id !== elementId) }
        ),
      }),
      () => apiDelete(`/api/inspections/${inspection.id}/elements/${elementId}`, "Odstránenie prvku")
    );
  }

  async function addElement(categoryId: string) {
    await create(
      () =>
        apiPost<FullElement>(
          `/api/inspections/${inspection.id}/categories/${categoryId}/elements`,
          { name: "Nový prvok" },
          "Nový technický prvok"
        ),
      (prev, created) => ({
        ...prev,
        categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, elements: [...c.elements, created] } : c)),
      })
    );
  }

  function renameCategory(categoryId: string, name: string) {
    void applyAndSave(
      (prev) => ({ ...prev, categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/categories/${categoryId}`, { name }, "Názov kategórie")
    );
  }

  function deleteCategory(categoryId: string) {
    void applyAndSave(
      (prev) => ({ ...prev, categories: prev.categories.filter((c) => c.id !== categoryId) }),
      () => apiDelete(`/api/inspections/${inspection.id}/categories/${categoryId}`, "Odstránenie kategórie")
    );
  }

  async function addCategory() {
    await create(
      () =>
        apiPost<FullCategory>(
          `/api/inspections/${inspection.id}/categories`,
          { name: "Nová kategória", order: categories.length },
          "Nová kategória"
        ),
      (prev, created) => ({ ...prev, categories: [...prev.categories, { ...created, elements: [] }] })
    );
  }

  return (
    <div>
      <StepPageHeader
        title="Technický stav"
        description="Spoločné a stavebné prvky nehnuteľnosti, nezávislé od jednotlivých miestností."
      />

      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={() => void addCategory()}>
          <Plus /> Pridať kategóriu
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onRename={(name) => renameCategory(category.id, name)}
            onDelete={() => deleteCategory(category.id)}
            onAddElement={() => void addElement(category.id)}
            onRenameElement={(elementId, name) => renameElement(category.id, elementId, name)}
            onDeleteElement={(elementId) => deleteElement(category.id, elementId)}
            onFindingChange={(findingId, patch) => updateFinding(findingId, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  onRename,
  onDelete,
  onAddElement,
  onRenameElement,
  onDeleteElement,
  onFindingChange,
}: {
  category: FullCategory;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddElement: () => void;
  onRenameElement: (elementId: string, name: string) => void;
  onDeleteElement: (elementId: string) => void;
  onFindingChange: (findingId: string, patch: Partial<FullFinding>) => void;
}) {
  const [open, setOpen] = useState(false);
  const elements = category.elements.slice().sort((a, b) => a.order - b.order);
  const issueCount = elements.flatMap((e) => e.findings).filter((f) => f.status === "V" || f.status === "R").length;

  return (
    <StepSection
      title=""
      className="mb-0"
      actions={
        <ConfirmDeleteButton
          onConfirm={onDelete}
          title="Odstrániť kategóriu?"
          description={`Odstránia sa aj všetky prvky v kategórii „${category.name}“.`}
        />
      }
    >
      <div className="-mt-2 -mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown className={cn("size-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          <span className="font-semibold text-slate-900">
            {category.name}
            {issueCount > 0 && <span className="ml-2 text-xs font-normal text-amber-700">{issueCount}× zistenie</span>}
          </span>
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-3">
          <InlineTextField label="Názov kategórie" value={category.name} onCommit={onRename} />
          <div className="flex flex-col gap-2">
            {elements.map((element) => (
              <div key={element.id} className="rounded-lg bg-slate-50 p-2">
                <div className="mb-1.5 flex items-center gap-2">
                  <InlineTextField
                    value={element.name}
                    onCommit={(v) => onRenameElement(element.id, v)}
                    className="flex-1"
                  />
                  <ConfirmDeleteButton
                    onConfirm={() => onDeleteElement(element.id)}
                    title="Odstrániť prvok?"
                    description={`Naozaj chcete odstrániť prvok „${element.name}“?`}
                  />
                </div>
                {element.findings[0] ? (
                  <RoomChecklistRow
                    finding={element.findings[0]}
                    onChange={(patch) => onFindingChange(element.findings[0].id, patch)}
                  />
                ) : (
                  <p className="text-xs text-slate-400">Prvok bez záznamu hodnotenia</p>
                )}
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={onAddElement} className="self-start">
            <Plus /> Pridať prvok
          </Button>
          {elements.length === 0 && <p className="text-sm text-slate-400">Kategória zatiaľ nemá žiadne prvky.</p>}
        </div>
      )}
    </StepSection>
  );
}
