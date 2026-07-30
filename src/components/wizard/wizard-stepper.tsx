"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
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
  const scrollerRef = useRef<HTMLElement | null>(null);

  // The eleven steps are far wider than a phone screen, so on later steps the current one sits
  // off-screen and had to be dragged into view by hand. Centre it whenever the step changes.
  useEffect(() => {
    const scroller = scrollerRef.current;
    // Found by query rather than by a ref on the active link: one ref shared across the list is
    // set by whichever child React commits last, so stepping backwards left it holding null.
    const active = scroller?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!scroller || !active) return;

    // Positioned instantly, not animated. The page content under it swaps instantly too, so a
    // sliding strip would trail behind the step it labels — and smooth scrolling is driven by
    // requestAnimationFrame, which is exactly what a backgrounded or throttled tab stops running.
    // scrollLeft rather than scrollIntoView, so only this strip moves and the page does not jump
    // vertically to reach it.
    const target = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
    scroller.scrollLeft = Math.max(0, Math.min(target, scroller.scrollWidth - scroller.clientWidth));
  }, [params.step]);

  return (
    <nav ref={scrollerRef} aria-label="Postup obhliadky" className="overflow-x-auto">
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
