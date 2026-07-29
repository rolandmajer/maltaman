"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const isEditingRef = useRef(false);
  // Kept in a ref so the unmount cleanup below can flush without re-subscribing on every keystroke.
  const pendingRef = useRef<{ value: string; commit: (v: string) => void } | null>(null);
  const id = useId();

  // Resync local state when the external value changes (e.g. after a save/refetch), adjusted
  // during render rather than in an effect so it doesn't cost an extra render pass. Skipped while
  // the field has focus: a save landing mid-word would otherwise snap the box back to the
  // server's value and swallow the characters typed since — which reads as "it didn't save".
  if (value !== syncedValue && !isEditingRef.current) {
    setSyncedValue(value);
    setLocal(value);
  }

  // A pending edit must not be lost when the field unmounts — collapsing a card or moving to the
  // next step removes it mid-debounce, and without this the last thing typed would be dropped.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const pending = pendingRef.current;
      if (pending) pending.commit(pending.value);
    };
  }, []);

  function handleChange(next: string) {
    setLocal(next);
    pendingRef.current = { value: next, commit: onCommit };
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => flush(next), 600);
  }

  function flush(next: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    pendingRef.current = null;
    if (next !== value) onCommit(next);
  }

  function handleBlur() {
    isEditingRef.current = false;
    flush(local);
    // Pick up anything that changed while the field was focused and the resync was suppressed.
    if (local === value && value !== syncedValue) {
      setSyncedValue(value);
      setLocal(value);
    }
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
        onFocus={() => (isEditingRef.current = true)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          // Save straight away rather than waiting out the debounce, and drop the on-screen
          // keyboard so it's visibly committed.
          e.preventDefault();
          flush(e.currentTarget.value);
          e.currentTarget.blur();
        }}
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
  const isEditingRef = useRef(false);
  const pendingRef = useRef<{ value: string; commit: (v: string) => void } | null>(null);
  const id = useId();

  // Same focus guard and unmount flush as InlineTextField above — see the comments there.
  if (value !== syncedValue && !isEditingRef.current) {
    setSyncedValue(value);
    setLocal(value);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const pending = pendingRef.current;
      if (pending) pending.commit(pending.value);
    };
  }, []);

  function handleChange(next: string) {
    setLocal(next);
    pendingRef.current = { value: next, commit: onCommit };
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => flush(next), 600);
  }

  function flush(next: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    pendingRef.current = null;
    if (next !== value) onCommit(next);
  }

  function handleBlur() {
    isEditingRef.current = false;
    flush(local);
    if (local === value && value !== syncedValue) {
      setSyncedValue(value);
      setLocal(value);
    }
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
        onFocus={() => (isEditingRef.current = true)}
        onKeyDown={(e) => {
          // Plain Enter must stay a newline in a multi-line field, so Ctrl/Cmd+Enter saves.
          if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
          e.preventDefault();
          flush(e.currentTarget.value);
          e.currentTarget.blur();
        }}
        onBlur={handleBlur}
      />
    </div>
  );
}
