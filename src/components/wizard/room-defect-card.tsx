"use client";

import { FindingStatusBadge } from "@/components/finding-status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FINDING_SEVERITY_LABELS } from "@/lib/constants";

/**
 * Same visual shape as SortableFindingCard, for a room-checklist ElementCondition rather than a
 * Finding. Not draggable/sortable: ElementCondition.order is scoped per-RoomElement, so there's
 * no single well-defined order across every room's conditions to drag-reorder against — see the
 * comment in step-zhrnutie.tsx for why this is its own section instead of interleaved.
 */
export function RoomDefectCard({
  status,
  label,
  locationLabel,
  description,
  severity,
  includeInSummary,
  onSeverityChange,
  onIncludeChange,
}: {
  status: string;
  label: string;
  locationLabel: string;
  description: string;
  severity: string | null;
  includeInSummary: boolean;
  onSeverityChange: (severity: string) => void;
  onIncludeChange: (include: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <Checkbox
        checked={includeInSummary}
        onCheckedChange={(v) => onIncludeChange(Boolean(v))}
        aria-label="Zahrnúť do zhrnutia"
        className="mt-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <FindingStatusBadge status={status as "V" | "R"} />
          <p className="font-medium text-slate-900">{label}</p>
          <span className="text-xs text-slate-400">{locationLabel}</span>
        </div>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        <select
          className="mt-2 h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
          value={severity ?? "STREDNA"}
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
