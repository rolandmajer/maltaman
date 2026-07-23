"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { WIZARD_STEPS, type WizardStepKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function WizardStepper({
  inspectionId,
  completion,
}: {
  inspectionId: string;
  completion: Record<WizardStepKey, boolean>;
}) {
  const params = useParams<{ step: string }>();

  return (
    <nav aria-label="Postup obhliadky" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 px-2 py-2">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = params.step === step.key;
          const isDone = completion[step.key];
          return (
            <li key={step.key} className="flex items-center gap-1">
              <Link
                href={`/obhliadky/${inspectionId}/${step.key}`}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                  isActive
                    ? "border-brand-700 bg-brand-700 text-white"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px]",
                    isActive ? "bg-white/20" : isDone ? "bg-emerald-200" : "bg-slate-100"
                  )}
                >
                  {isDone ? <Check className="size-3" /> : index + 1}
                </span>
                {step.label}
              </Link>
              {index < WIZARD_STEPS.length - 1 && <span className="h-px w-3 bg-slate-200" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
