"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StatusToggle } from "@/components/wizard/status-toggle";
import { InlineTextField, InlineTextAreaField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { FINDING_SEVERITY_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FullFinding } from "@/types/inspection";

export function RoomChecklistRow({
  finding,
  onChange,
}: {
  finding: FullFinding;
  onChange: (patch: Partial<FullFinding>) => void;
}) {
  const needsDetail = finding.status === "V" || finding.status === "R";
  const [expanded, setExpanded] = useState(needsDetail);

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 p-2.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-slate-800"
          aria-expanded={expanded}
        >
          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} />
          {finding.label}
        </button>
        <StatusToggle
          ariaLabel={`Hodnotenie — ${finding.label}`}
          value={finding.status}
          onChange={(status) => {
            onChange({ status, severity: status === "V" || status === "R" ? (finding.severity ?? "STREDNA") : null });
            if (status === "V" || status === "R") setExpanded(true);
          }}
        />
      </div>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-slate-100 p-3">
          <InlineTextAreaField
            label="Zistenie / poznámka"
            value={finding.description}
            onCommit={(v) => onChange({ description: v })}
          />
          {needsDetail && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NativeSelectField
                label="Závažnosť"
                value={finding.severity ?? "STREDNA"}
                onChange={(v) => onChange({ severity: v as FullFinding["severity"] })}
              >
                {Object.entries(FINDING_SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelectField>
              <NativeSelectField
                label="Naliehavosť"
                value={finding.urgency ?? ""}
                onChange={(v) => onChange({ urgency: (v || null) as FullFinding["urgency"] })}
              >
                <option value="">—</option>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelectField>
              <InlineTextField
                label="Odporúčaná náprava"
                value={finding.recommendedAction}
                className="sm:col-span-2"
                onCommit={(v) => onChange({ recommendedAction: v })}
              />
              <InlineTextField
                label="Odporúčaný špecialista"
                value={finding.recommendedSpecialist}
                onCommit={(v) => onChange({ recommendedSpecialist: v })}
              />
              <InlineTextField label="Lokalizácia" value={finding.location} onCommit={(v) => onChange({ location: v })} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
