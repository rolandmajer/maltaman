"use client";

import { useEffect, useRef } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export function SignaturePad({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, { backgroundColor: "rgb(255,255,255)", penColor: "rgb(16,24,40)" });
    padRef.current = pad;
    if (value) pad.fromDataURL(value);

    return () => pad.off();
  }, [value]);

  function clear() {
    padRef.current?.clear();
  }

  function save() {
    if (!padRef.current || padRef.current.isEmpty()) return;
    onSave(padRef.current.toDataURL("image/png"));
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-lg border border-slate-300 bg-white"
        aria-label="Plocha pre podpis"
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={clear}>
          <Eraser /> Vymazať
        </Button>
        <Button type="button" size="sm" onClick={save}>
          Uložiť podpis
        </Button>
      </div>
    </div>
  );
}
