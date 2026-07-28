"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StatusToggle } from "@/components/wizard/status-toggle";
import { InlineTextAreaField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { SearchableSelect, SearchableMultiSelect } from "@/components/wizard/searchable-select";
import {
  FINDING_SEVERITY_LABELS,
  PRIORITY_LABELS,
  GENERAL_DEFECT_PRESETS,
  CONDITION_LOCATION_PRESETS,
  CONDITION_RECOMMENDED_ACTION_PRESETS,
  RECOMMENDED_SPECIALIST_PRESETS,
} from "@/lib/constants";
import { parseJsonStringArray, stringifyJsonArray } from "@/lib/element-description";
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
  const defectTypes = parseJsonStringArray(finding.defectTypes);

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
          {needsDetail && (
            <SearchableMultiSelect
              label="Typ stavu alebo poškodenia"
              values={defectTypes}
              onChange={(values) => onChange({ defectTypes: stringifyJsonArray(values) })}
              options={GENERAL_DEFECT_PRESETS}
              category="defect-type"
            />
          )}
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
              <div className="sm:col-span-2">
                <SearchableSelect
                  label="Odporúčaná náprava"
                  value={finding.recommendedAction}
                  onChange={(v) => onChange({ recommendedAction: v })}
                  options={CONDITION_RECOMMENDED_ACTION_PRESETS}
                  category="recommended-action"
                />
              </div>
              <SearchableSelect
                label="Odporúčaný špecialista"
                value={finding.recommendedSpecialist}
                onChange={(v) => onChange({ recommendedSpecialist: v })}
                options={RECOMMENDED_SPECIALIST_PRESETS}
                category="recommended-specialist"
              />
              <SearchableSelect
                label="Lokalizácia"
                value={finding.location}
                onChange={(v) => onChange({ location: v })}
                options={CONDITION_LOCATION_PRESETS}
                category="location"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
