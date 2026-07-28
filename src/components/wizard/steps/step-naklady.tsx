"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { CostItemCard } from "@/components/wizard/cost-item-card";
import { InlineTextField } from "@/components/wizard/inline-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeCostItem, computeCostTotals, type CostItemForTotals } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { PRIORITY_LABELS } from "@/lib/constants";
import { parseJsonStringArray } from "@/lib/element-description";
import type { FullCostCategory, FullCostItem, FullFinding, FullInspection } from "@/types/inspection";

/** One un-priced defect offered in the "+ Položka zo zistenia" picker, from either source. */
type DefectSource = {
  key: string;
  name: string;
  description: string;
  /** Where the defect is — shown next to the name so same-named defects stay distinguishable. */
  location: string;
  /** The FK(s) tying the created cost item back to its defect. */
  payload: Record<string, string | null>;
};

/** "Kúpeľňa" for room findings, "Strecha · Krytina" for Technický stav ones. */
function findingLocation(
  finding: FullFinding,
  roomNames: Map<string, string>,
  categories: FullInspection["categories"]
): string {
  if (finding.roomId) return roomNames.get(finding.roomId) ?? "";
  if (finding.elementId) {
    for (const cat of categories) {
      const el = cat.elements.find((e) => e.id === finding.elementId);
      if (el) return `${cat.name} · ${el.name}`;
    }
  }
  return finding.location;
}

export function StepNaklady() {
  const { inspection, applyAndSave, create } = useInspectionContext();
  const [findingPickerOpen, setFindingPickerOpen] = useState(false);

  const categories = inspection.costCategories.slice().sort((a, b) => a.order - b.order);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const roomNameById = new Map(inspection.rooms.map((r) => [r.id, r.name]));

  const totals = useMemo(() => {
    const items: CostItemForTotals[] = inspection.costItems.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryName: categoryNameById.get(item.categoryId) ?? "",
      roomId: item.roomId,
      roomName: item.roomId ? roomNameById.get(item.roomId) : null,
      priority: item.priority,
      included: item.included,
      ...computeCostItem(item),
    }));
    return computeCostTotals(items, inspection.contingencyPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.costItems, inspection.contingencyPercent]);

  function updateItem(id: string, patch: Partial<FullCostItem>) {
    void applyAndSave(
      (prev) => ({ ...prev, costItems: prev.costItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/cost-items/${id}`, patch, "Položka nákladov")
    );
  }

  function deleteItem(id: string) {
    void applyAndSave(
      (prev) => ({ ...prev, costItems: prev.costItems.filter((i) => i.id !== id) }),
      () => apiDelete(`/api/inspections/${inspection.id}/cost-items/${id}`, "Odstránenie položky")
    );
  }

  async function addItem(categoryId: string) {
    await create(
      () =>
        apiPost<FullCostItem>(
          `/api/inspections/${inspection.id}/cost-items`,
          { categoryId, name: "Nová položka", quantity: 1, unit: "KS" },
          "Nová položka nákladov"
        ),
      (prev, created) => ({ ...prev, costItems: [...prev.costItems, created] })
    );
  }

  async function addItemFromDefect(key: string) {
    const defect = uncostedDefects.find((d) => d.key === key);
    if (!defect) return;
    setFindingPickerOpen(false);
    if (!categories[0]) {
      toast.error("Najprv pridajte aspoň jednu kategóriu nákladov.");
      return;
    }
    await create(
      () =>
        apiPost<FullCostItem>(
          `/api/inspections/${inspection.id}/cost-items`,
          {
            categoryId: categories[0]?.id,
            ...defect.payload,
            // Carry the location into the item name so the budget line stays self-describing
            // even after the source defect is edited or the report is read out of context.
            name: defect.location ? `${defect.name} — ${defect.location}` : defect.name,
            description: defect.description,
            quantity: 1,
            unit: "KS",
          },
          "Položka zo zistenia"
        ),
      (prev, created) => ({ ...prev, costItems: [...prev.costItems, created] })
    );
    toast.success(`„${defect.name}“ pridané ako položka nákladov.`);
  }

  async function addCategory() {
    await create(
      () =>
        apiPost<FullCostCategory>(
          `/api/inspections/${inspection.id}/cost-categories`,
          { name: "Nová kategória", order: categories.length },
          "Nová kategória nákladov"
        ),
      (prev, created) => ({ ...prev, costCategories: [...prev.costCategories, created] })
    );
  }

  function renameCategory(id: string, name: string) {
    void applyAndSave(
      (prev) => ({ ...prev, costCategories: prev.costCategories.map((c) => (c.id === id ? { ...c, name } : c)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/cost-categories/${id}`, { name }, "Kategória")
    );
  }

  function deleteCategory(id: string) {
    void applyAndSave(
      (prev) => ({ ...prev, costCategories: prev.costCategories.filter((c) => c.id !== id) }),
      () => apiDelete(`/api/inspections/${inspection.id}/cost-categories/${id}`, "Odstránenie kategórie")
    );
  }

  function updateContingency(value: number) {
    void applyAndSave(
      (prev) => ({ ...prev, contingencyPercent: value }),
      () => apiPatch(`/api/inspections/${inspection.id}`, { contingencyPercent: value })
    );
  }

  function toggleVatIncluded(value: boolean) {
    void applyAndSave(
      (prev) => ({ ...prev, costsIncludeVat: value }),
      () => apiPatch(`/api/inspections/${inspection.id}`, { costsIncludeVat: value })
    );
  }

  // Every un-priced defect in the protocol, from both sources: the flat Finding list (Technický
  // stav) and the room checklist's ElementConditions. Room conditions were previously missing
  // from this picker entirely, so room defects could not be turned into cost items at all.
  const uncostedDefects = ((): DefectSource[] => {
    const roomNames = new Map(inspection.rooms.map((r) => [r.id, r.name]));

    const findingSources: DefectSource[] = inspection.findings
      .filter((f) => (f.status === "V" || f.status === "R") && !inspection.costItems.some((c) => c.findingId === f.id))
      .map((f) => ({
        key: `finding:${f.id}`,
        name: f.label,
        description: f.description,
        location: findingLocation(f, roomNames, inspection.categories),
        payload: { findingId: f.id, roomId: f.roomId },
      }));

    const conditionSources: DefectSource[] = inspection.rooms.flatMap((room) =>
      room.elements
        .filter((el) => el.status === "V" || el.status === "R")
        .flatMap((el) =>
          el.conditions
            .filter((c) => !inspection.costItems.some((ci) => ci.elementConditionId === c.id))
            .map((c) => ({
              key: `condition:${c.id}`,
              name: el.label,
              description:
                [parseJsonStringArray(c.defectTypes).join(", "), c.note].filter(Boolean).join(" — ") || el.description,
              location: [room.name, c.location].filter(Boolean).join(" · "),
              payload: { elementConditionId: c.id, roomElementId: el.id, roomId: room.id },
            }))
        )
    );

    return [...findingSources, ...conditionSources];
  })();

  return (
    <div>
      <StepPageHeader title="Odhad nákladov" description="Itemizovaný rozpočet na odstránenie zistených vád." />

      <StepSection title="Súhrn">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Total label="Spolu bez DPH" value={totals.totalExclVat} />
          <Total label="DPH" value={totals.totalVat} />
          <Total label="Spolu s DPH" value={totals.totalInclVat} highlight />
          <Total label="S rezervou" value={totals.finalTotalWithContingency} highlight />
          <Total label="Minimálny scenár" value={totals.totalMin} />
          <Total label="Očakávaný scenár" value={totals.totalExpected} />
          <Total label="Maximálny scenár" value={totals.totalMax} />
        </div>
        <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="contingency" className="whitespace-nowrap">Rezerva na nepredvídané práce (%)</Label>
            <InlineTextField
              value={String(inspection.contingencyPercent)}
              type="number"
              onCommit={(v) => updateContingency(Number(v) || 0)}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={inspection.costsIncludeVat} onCheckedChange={toggleVatIncluded} id="vat-included" />
            <Label htmlFor="vat-included">Ceny vrátane DPH v reporte</Label>
          </div>
        </div>
        {totals.byPriority.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            {totals.byPriority.map((p) => (
              <span key={p.priority} className="rounded-full bg-slate-100 px-2 py-1">
                {PRIORITY_LABELS[p.priority]}: {formatCurrency(p.totalInclVat)}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400">
          Odhady sú orientačné, v cenovej úrovni ku dňu obhliadky. Táto informácia sa zobrazí aj vo finálnom reporte.
        </p>
      </StepSection>

      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <Select
          open={findingPickerOpen}
          onOpenChange={setFindingPickerOpen}
          onValueChange={(v) => void addItemFromDefect(v)}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder={`+ Položka zo zistenia… (${uncostedDefects.length})`} />
          </SelectTrigger>
          <SelectContent>
            {uncostedDefects.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-slate-400">Žiadne zistenia bez položky</div>
            )}
            {uncostedDefects.map((d) => (
              <SelectItem key={d.key} value={d.key}>
                <span className="flex flex-col items-start">
                  <span>{d.name}</span>
                  {d.location && <span className="text-xs text-slate-400">{d.location}</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => void addCategory()}>
          <Plus /> Pridať kategóriu
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {categories.map((category) => {
          const items = inspection.costItems.filter((i) => i.categoryId === category.id).sort((a, b) => a.order - b.order);
          const subtotal = totals.byCategory.find((c) => c.categoryId === category.id)?.totalInclVat ?? 0;
          return (
            <StepSection
              key={category.id}
              title=""
              className="mb-0"
              actions={
                <ConfirmDeleteButton
                  onConfirm={() => deleteCategory(category.id)}
                  title="Odstrániť kategóriu?"
                  description={`Odstránia sa aj všetky položky v kategórii „${category.name}“.`}
                />
              }
            >
              <div className="-mt-2 flex items-center justify-between gap-2">
                <InlineTextField value={category.name} onCommit={(v) => renameCategory(category.id, v)} className="flex-1" />
                <span className="whitespace-nowrap text-sm font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <CostItemCard
                    key={item.id}
                    item={item}
                    roomOptions={inspection.rooms.map((r) => ({ id: r.id, name: r.name }))}
                    onUpdate={(patch) => updateItem(item.id, patch)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => void addItem(category.id)} className="self-start">
                <Plus /> Pridať položku
              </Button>
            </StepSection>
          );
        })}
      </div>
    </div>
  );
}

function Total({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-lg bg-brand-50 p-2" : ""}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={highlight ? "font-semibold text-brand-800" : "font-medium text-slate-800"}>{formatCurrency(value)}</p>
    </div>
  );
}
