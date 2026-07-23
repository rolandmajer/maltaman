"use client";

import { cn } from "@/lib/utils";
import { FINDING_STATUS_SHORT } from "@/lib/constants";

const OPTIONS = ["OK", "V", "R", "N"] as const;

const TONE: Record<(typeof OPTIONS)[number], string> = {
  OK: "data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:border-emerald-600",
  V: "data-[active=true]:bg-amber-600 data-[active=true]:text-white data-[active=true]:border-amber-600",
  R: "data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600",
  N: "data-[active=true]:bg-slate-500 data-[active=true]:text-white data-[active=true]:border-slate-500",
};

/** Accessible segmented control for the OK/V/R/N assessment — status is conveyed by label, not color alone. */
export function StatusToggle({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: "OK" | "V" | "R" | "N") => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex shrink-0 gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          data-active={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            "flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 px-2 text-xs font-semibold text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
            TONE[opt]
          )}
        >
          {FINDING_STATUS_SHORT[opt]}
        </button>
      ))}
    </div>
  );
}
