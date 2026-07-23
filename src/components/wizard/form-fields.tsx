"use client";

import { Controller, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function FieldWrapper({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  type = "text",
  className,
  ...props
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label?: string;
  type?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "form" | "name">) {
  const error = form.formState.errors[name]?.message as string | undefined;
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} className={className}>
      <Input id={name} type={type} {...form.register(name)} {...props} />
    </FieldWrapper>
  );
}

export function TextAreaField<T extends FieldValues>({
  form,
  name,
  label,
  className,
  rows = 3,
  ...props
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label?: string;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "form" | "name">) {
  const error = form.formState.errors[name]?.message as string | undefined;
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} className={className}>
      <Textarea id={name} rows={rows} {...form.register(name)} {...props} />
    </FieldWrapper>
  );
}

export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  options,
  placeholder = "Vyberte…",
  className,
  allowEmpty,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  allowEmpty?: boolean;
}) {
  const error = form.formState.errors[name]?.message as string | undefined;
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} className={className}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ?? ""}
            onValueChange={(v) => field.onChange(v === "__empty__" ? "" : v)}
          >
            <SelectTrigger id={name}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowEmpty && <SelectItem value="__empty__">—</SelectItem>}
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldWrapper>
  );
}
