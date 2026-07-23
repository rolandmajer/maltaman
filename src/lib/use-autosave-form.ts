"use client";

import { useEffect, useRef } from "react";
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";

/**
 * React Hook Form + Zod, with debounced autosave on every valid change (blur or edit) —
 * this is how every step implements "save work continuously" without an explicit Save button.
 */
export function useAutosaveForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSave,
  debounceMs = 700,
}: {
  schema: ZodTypeAny;
  defaultValues: DefaultValues<T>;
  onSave: (values: T) => void | Promise<void>;
  debounceMs?: number;
}) {
  const form = useForm<T>({
    resolver: zodResolver(schema as never) as unknown as Resolver<T>,
    defaultValues,
    mode: "onBlur",
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(defaultValues));

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        const valid = await form.trigger();
        if (!valid) return;
        const serialized = JSON.stringify(values);
        if (serialized === lastSavedRef.current) return;
        lastSavedRef.current = serialized;
        await onSave(values as T);
      }, debounceMs);
    });
    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, debounceMs]);

  return form;
}
