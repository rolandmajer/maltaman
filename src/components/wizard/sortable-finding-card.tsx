"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { FindingStatusBadge } from "@/components/finding-status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FINDING_SEVERITY_LABELS } from "@/lib/constants";
import type { FullFinding } from "@/types/inspection";

export function SortableFindingCard({
  finding,
  locationLabel,
  onSeverityChange,
  onIncludeChange,
}: {
  finding: FullFinding;
  locationLabel: string;
  onSeverityChange: (severity: string) => void;
  onIncludeChange: (include: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: finding.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3"
      data-dragging={isDragging}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        aria-label="Presunúť"
      >
        <GripVertical className="size-5" />
      </button>
      <Checkbox
        checked={finding.includeInSummary}
        onCheckedChange={(v) => onIncludeChange(Boolean(v))}
        aria-label="Zahrnúť do zhrnutia"
        className="mt-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <FindingStatusBadge status={finding.status} />
          <p className="font-medium text-slate-900">{finding.label}</p>
          <span className="text-xs text-slate-400">{locationLabel}</span>
        </div>
        {finding.description && <p className="mt-1 text-sm text-slate-600">{finding.description}</p>}
        <select
          className="mt-2 h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
          value={finding.severity ?? "STREDNA"}
          onChange={(e) => onSeverityChange(e.target.value)}
        >
          {Object.entries(FINDING_SEVERITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
