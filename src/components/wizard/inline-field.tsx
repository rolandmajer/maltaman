"use client";

import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Debounced, uncontrolled-feeling input for dynamic list items (participants, findings, cost items…). */
export function InlineTextField({
  label,
  value,
  onCommit,
  className,
  type = "text",
  placeholder,
}: {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  type?: string;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  // Resync local state when the external value changes (e.g. after a save/refetch), adjusted
  // during render rather than in an effect so it doesn't cost an extra render pass.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setLocal(value);
  }

  function handleChange(next: string) {
    setLocal(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onCommit(next), 600);
  }

  function handleBlur() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (local !== value) onCommit(local);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        type={type}
        value={local}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}

export function InlineTextAreaField({
  label,
  value,
  onCommit,
  className,
  rows = 2,
  placeholder,
}: {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  if (value !== syncedValue) {
    setSyncedValue(value);
    setLocal(value);
  }

  function handleChange(next: string) {
    setLocal(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onCommit(next), 600);
  }

  function handleBlur() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (local !== value) onCommit(local);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Textarea
        id={id}
        value={local}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}
