"use client";

import { useRef, useState } from "react";
import { Circle, MoveUpRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Annotation =
  | { id: string; type: "circle"; x: number; y: number; label: string }
  | { id: string; type: "arrow"; x: number; y: number; x2: number; y2: number; label: string };

/** Tap-to-annotate overlay: circle markers via a single tap, arrows via two taps. Percent-based coords. */
export function PhotoAnnotator({
  imageUrl,
  annotations,
  onChange,
}: {
  imageUrl: string;
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
}) {
  const [mode, setMode] = useState<"circle" | "arrow">("circle");
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [pendingLabel, setPendingLabel] = useState<Annotation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (mode === "circle") {
      const annotation: Annotation = { id: crypto.randomUUID(), type: "circle", x, y, label: "" };
      setPendingLabel(annotation);
      return;
    }

    if (!arrowStart) {
      setArrowStart({ x, y });
    } else {
      const annotation: Annotation = { id: crypto.randomUUID(), type: "arrow", x: arrowStart.x, y: arrowStart.y, x2: x, y2: y, label: "" };
      setArrowStart(null);
      setPendingLabel(annotation);
    }
  }

  function confirmLabel(label: string) {
    if (!pendingLabel) return;
    onChange([...annotations, { ...pendingLabel, label }]);
    setPendingLabel(null);
  }

  function removeAnnotation(id: string) {
    onChange(annotations.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === "circle" ? "default" : "outline"} onClick={() => setMode("circle")}>
          <Circle /> Kruh
        </Button>
        <Button type="button" size="sm" variant={mode === "arrow" ? "default" : "outline"} onClick={() => setMode("arrow")}>
          <MoveUpRight /> Šípka
        </Button>
        {arrowStart && <span className="self-center text-xs text-slate-500">Ťuknite na koncový bod šípky…</span>}
      </div>

      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative w-full cursor-crosshair overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="block w-full select-none" draggable={false} />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {annotations.map((a) =>
            a.type === "circle" ? (
              <g key={a.id}>
                <circle cx={a.x} cy={a.y} r={3} fill="none" stroke="#ef4444" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
              </g>
            ) : (
              <g key={a.id}>
                <line x1={a.x} y1={a.y} x2={a.x2} y2={a.y2} stroke="#ef4444" strokeWidth={0.8} vectorEffect="non-scaling-stroke" markerEnd="url(#arrowhead)" />
              </g>
            )
          )}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
        {annotations.map((a) => (
          <span
            key={a.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-red-600 px-1 text-[10px] font-medium text-white shadow"
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
          >
            {a.label}
          </span>
        ))}
      </div>

      {annotations.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {annotations.map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
              {a.label || "(bez popisu)"}
              <button type="button" onClick={() => removeAnnotation(a.id)} aria-label="Odstrániť značku">
                <Trash2 className="size-3 text-red-500" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingLabel && (
        <div className={cn("flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-2")}>
          <Input
            autoFocus
            placeholder="Krátky popis značky…"
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmLabel((e.target as HTMLInputElement).value);
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement) ?? null;
              confirmLabel(input?.value ?? "");
            }}
          >
            Uložiť
          </Button>
        </div>
      )}
    </div>
  );
}
