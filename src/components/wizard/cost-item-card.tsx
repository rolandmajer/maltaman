"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import { InlineTextField, InlineTextAreaField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { computeCostItem } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { COST_UNIT_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { cn, scrollCardIntoView } from "@/lib/utils";
import type { FullCostItem } from "@/types/inspection";

export function CostItemCard({
  item,
  roomOptions,
  enteredInclVat,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  item: FullCostItem;
  roomOptions: { id: string; name: string }[];
  /** Whether the amounts on this item were typed gross — see the switch in Odhad nákladov. */
  enteredInclVat: boolean;
  onUpdate: (patch: Partial<FullCostItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const computed = computeCostItem(item, enteredInclVat);
  // The amount fields mean different things in the two modes, so say which on every label.
  const vatSuffix = enteredInclVat ? "s DPH" : "bez DPH";

  /** Collapse from the bottom of the card without leaving the technician stranded below it. */
  function collapse() {
    setOpen(false);
    scrollCardIntoView(cardRef.current);
  }

  return (
    <div
      ref={cardRef}
      data-testid="cost-item-card"
      data-item-id={item.id}
      className={cn("rounded-lg border border-slate-200 bg-white", !item.included && "opacity-60")}
    >
      <div className="flex items-center gap-2 p-2.5">
        <Checkbox
          checked={item.included}
          onCheckedChange={(v) => onUpdate({ included: Boolean(v) })}
          aria-label="Zahrnúť položku do rozpočtu"
        />
        <button
          type="button"
          data-testid="cost-item-toggle"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{item.name || "Nová položka"}</p>
            <p className="text-xs text-slate-500">
              {item.quantity} {COST_UNIT_LABELS[item.unit]} · {PRIORITY_LABELS[item.priority]}
            </p>
          </div>
        </button>
        <span className="shrink-0 text-sm font-semibold text-slate-800">{formatCurrency(computed.priceInclVat)}</span>
        <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplikovať položku" title="Duplikovať položku">
          <Copy className="size-4" />
        </Button>
        <ConfirmDeleteButton onConfirm={onDelete} title="Odstrániť položku?" description={`Odstrániť „${item.name}“ z rozpočtu?`} />
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
          <InlineTextField label="Názov položky" value={item.name} className="sm:col-span-2" required onCommit={(v) => onUpdate({ name: v })} />
          <InlineTextAreaField
            label="Podrobný popis"
            value={item.description}
            className="sm:col-span-2"
            onCommit={(v) => onUpdate({ description: v })}
          />

          <NativeSelectField
            label="Miestnosť"
            value={item.roomId ?? ""}
            onChange={(v) => onUpdate({ roomId: v || null })}
          >
            <option value="">—</option>
            {roomOptions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </NativeSelectField>
          <NativeSelectField
            label="Priorita"
            value={item.priority}
            onChange={(v) => onUpdate({ priority: v as FullCostItem["priority"] })}
          >
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </NativeSelectField>

          <div className="grid grid-cols-2 gap-2">
            <InlineTextField
              label="Množstvo"
              type="number"
              value={String(item.quantity)}
              onCommit={(v) => onUpdate({ quantity: Number(v) || 0 })}
            />
            <NativeSelectField
              label="Jednotka"
              value={item.unit}
              onChange={(v) => onUpdate({ unit: v as FullCostItem["unit"] })}
            >
              {Object.entries(COST_UNIT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </NativeSelectField>
          </div>
          <InlineTextField
            label={`Jednotková cena (€ ${vatSuffix})`}
            type="number"
            value={String(item.unitPrice)}
            onCommit={(v) => onUpdate({ unitPrice: Number(v) || 0 })}
          />

          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <InlineTextField label={`Práca (€ ${vatSuffix})`} type="number" value={String(item.laborCost)} onCommit={(v) => onUpdate({ laborCost: Number(v) || 0 })} />
            <InlineTextField label={`Materiál (€ ${vatSuffix})`} type="number" value={String(item.materialCost)} onCommit={(v) => onUpdate({ materialCost: Number(v) || 0 })} />
            <InlineTextField label={`Ostatné (€ ${vatSuffix})`} type="number" value={String(item.otherCost)} onCommit={(v) => onUpdate({ otherCost: Number(v) || 0 })} />
          </div>

          <InlineTextField
            label="Sadzba DPH (%)"
            type="number"
            value={String(item.vatRatePercent)}
            onCommit={(v) => onUpdate({ vatRatePercent: Number(v) || 0 })}
          />
          <div className="rounded-lg bg-slate-50 p-2 text-sm">
            <p>Bez DPH: <strong>{formatCurrency(computed.priceExclVat)}</strong></p>
            <p>DPH: <strong>{formatCurrency(computed.vatAmount)}</strong></p>
            <p>S DPH: <strong>{formatCurrency(computed.priceInclVat)}</strong></p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <InlineTextField label="Min. odhad (€)" type="number" value={String(item.minEstimate ?? "")} onCommit={(v) => onUpdate({ minEstimate: v ? Number(v) : null })} />
            <InlineTextField label="Očakávaný odhad (€)" type="number" value={String(item.expectedEstimate ?? "")} onCommit={(v) => onUpdate({ expectedEstimate: v ? Number(v) : null })} />
            <InlineTextField label="Max. odhad (€)" type="number" value={String(item.maxEstimate ?? "")} onCommit={(v) => onUpdate({ maxEstimate: v ? Number(v) : null })} />
          </div>

          <InlineTextField label="Termín / horizont realizácie" value={item.completionHorizon} onCommit={(v) => onUpdate({ completionHorizon: v })} />
          <InlineTextField label="Dodávateľ / špecialista" value={item.supplier} onCommit={(v) => onUpdate({ supplier: v })} />
          <InlineTextField label="Zdroj odhadu" value={item.source} onCommit={(v) => onUpdate({ source: v })} />
          <InlineTextAreaField label="Poznámky" value={item.notes} className="sm:col-span-2" onCommit={(v) => onUpdate({ notes: v })} />

          <Button variant="outline" size="sm" onClick={collapse} className="w-full sm:col-span-2">
            <ChevronUp className="size-4" /> Zavrieť položku
          </Button>
        </div>
      )}
    </div>
  );
}
