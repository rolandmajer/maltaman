"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";

/** A native <select> with a properly associated <label> — used for compact inline pickers. */
export function NativeSelectField({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className ?? "flex flex-col gap-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}
