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
  required,
}: {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  type?: string;
  placeholder?: string;
  /**
   * Set for fields the server rejects when blank (names, labels). Clearing such a field to retype
   * it used to commit "" mid-edit, the API answered 400, and applyAndSave reacted by refetching the
   * whole inspection — which wiped whatever was being typed and read as the app deleting the text.
   * With this set, an empty value is never sent, and blurring while empty restores what was there.
   */
  required?: boolean;
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

  /** A required field must never be saved blank — see the `required` prop. */
  const isBlocked = (next: string) => Boolean(required) && next.trim() === "";

  function handleChange(next: string) {
    setLocal(next);
    pendingRef.current = isBlocked(next) ? null : { value: next, commit: onCommit };
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => flush(next), 600);
  }

  function flush(next: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    pendingRef.current = null;
    if (isBlocked(next)) return;
    if (next !== value) onCommit(next);
  }

  function handleBlur(current: string) {
    isEditingRef.current = false;
    if (isBlocked(current)) {
      // Cleared but never refilled — put back what was there rather than erroring.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      pendingRef.current = null;
      setLocal(value);
      setSyncedValue(value);
      return;
    }
    flush(current);
    // Pick up anything that changed while the field was focused and the resync was suppressed.
    if (current === value && value !== syncedValue) {
      setSyncedValue(value);
      setLocal(value);
    }
  }

  // Numeric fields are rendered as text with a decimal keypad rather than type="number".
  // type="number" throws away anything it considers invalid — including the Slovak decimal comma
  // the rest of the app prints — so "45,50" arrived here as "" and saved as 0. As text the comma
  // survives and parseDecimal can read it. inputMode still brings up the number keypad on a phone.
  const isNumeric = type === "number";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        type={isNumeric ? "text" : type}
        inputMode={isNumeric ? "decimal" : undefined}
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
        // Read the DOM value rather than the `local` state: if the last keystroke and the blur land
        // in the same tick, React has not re-rendered yet and `local` is a character behind.
        onBlur={(e) => handleBlur(e.currentTarget.value)}
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

  function handleBlur(current: string) {
    isEditingRef.current = false;
    flush(current);
    if (current === value && value !== syncedValue) {
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
        onBlur={(e) => handleBlur(e.currentTarget.value)}
      />
    </div>
  );
}
