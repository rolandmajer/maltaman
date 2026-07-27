"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/offline/api-client";
import { cn } from "@/lib/utils";

const CUSTOM_LABEL = "Iné – doplniť vlastný údaj";

type PresetValue = { id: string; value: string; usageCount: number };

// Module-level cache so multiple selects for the same category (e.g. many rooms' "Umiestnenie"
// pickers on one page) don't each issue their own fetch — recent-value lists are small and
// change rarely within a single editing session.
const recentCache = new Map<string, PresetValue[]>();
const inflight = new Map<string, Promise<PresetValue[]>>();

function fetchRecent(category: string): Promise<PresetValue[]> {
  if (recentCache.has(category)) return Promise.resolve(recentCache.get(category)!);
  if (inflight.has(category)) return inflight.get(category)!;
  const promise = apiGet<PresetValue[]>(`/api/settings/presets?category=${encodeURIComponent(category)}`)
    .then((values) => {
      recentCache.set(category, values);
      return values;
    })
    .catch(() => [] as PresetValue[])
    .finally(() => inflight.delete(category));
  inflight.set(category, promise);
  return promise;
}

function rememberValue(category: string, value: string) {
  void apiPost("/api/settings/presets", { category, value }).catch(() => undefined);
  // Optimistically bump the local cache so it's reflected next time this popover opens.
  const cached = recentCache.get(category);
  if (cached) {
    const existing = cached.find((c) => c.value === value);
    if (existing) existing.usageCount += 1;
    else cached.unshift({ id: `local-${value}`, value, usageCount: 1 });
    cached.sort((a, b) => b.usageCount - a.usageCount);
  }
}

function useOrderedOptions(category: string, options: string[]) {
  const [recent, setRecent] = useState<PresetValue[]>(() => recentCache.get(category) ?? []);
  useEffect(() => {
    let cancelled = false;
    void fetchRecent(category).then((values) => {
      if (!cancelled) setRecent(values);
    });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const recentValues = recent.map((r) => r.value).filter((v) => v !== CUSTOM_LABEL);
  const rest = options.filter((o) => !recentValues.includes(o));
  return [...recentValues, ...rest];
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  category,
  placeholder = "Vyberte…",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  category: string;
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const ordered = useOrderedOptions(category, options);
  const filtered = ordered.filter((o) => o.toLowerCase().includes(filter.toLowerCase()));

  function select(v: string) {
    onChange(v);
    rememberValue(category, v);
    setOpen(false);
    setFilter("");
    setCustomMode(false);
    setCustomValue("");
  }

  function submitCustom() {
    const trimmed = customValue.trim();
    if (trimmed) select(trimmed);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="flex h-11 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-base text-slate-800"
          >
            <span className={cn("truncate", !value && "text-slate-400")}>{value || placeholder}</span>
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <Input
            autoFocus
            placeholder="Hľadať…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => select(opt)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-brand-50"
              >
                {opt}
                {value === opt && <Check className="size-4 text-brand-600" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2 py-1.5 text-sm text-slate-400">Žiadne zhody</p>}
            <div className="mt-1 border-t border-slate-100 pt-1">
              {!customMode ? (
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-brand-700 hover:bg-brand-50"
                >
                  <Plus className="size-4" /> {CUSTOM_LABEL}
                </button>
              ) : (
                <div className="flex gap-1.5 p-1">
                  <Input
                    autoFocus
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                    placeholder="Vlastná hodnota"
                  />
                  <button
                    type="button"
                    onClick={submitCustom}
                    className="shrink-0 rounded-md bg-brand-600 px-3 text-sm font-medium text-white"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function SearchableMultiSelect({
  label,
  values,
  onChange,
  options,
  category,
  placeholder = "Vyberte…",
}: {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  category: string;
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [customValue, setCustomValue] = useState("");
  const ordered = useOrderedOptions(category, options);
  const filtered = ordered.filter((o) => o.toLowerCase().includes(filter.toLowerCase()));

  function toggle(v: string) {
    const next = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    onChange(next);
    if (!values.includes(v)) rememberValue(category, v);
  }

  function submitCustom() {
    const trimmed = customValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      rememberValue(category, trimmed);
    }
    setCustomValue("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="flex min-h-11 flex-wrap items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-left text-base text-slate-800"
          >
            {values.length === 0 && <span className="text-slate-400">{placeholder}</span>}
            {values.map((v) => (
              <span key={v} className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                {v}
              </span>
            ))}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <Input
            autoFocus
            placeholder="Hľadať…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((opt) => (
              <label
                key={opt}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-brand-50"
              >
                <Checkbox checked={values.includes(opt)} onCheckedChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
            {filtered.length === 0 && <p className="px-2 py-1.5 text-sm text-slate-400">Žiadne zhody</p>}
            <div className="mt-1 flex gap-1.5 border-t border-slate-100 p-1 pt-2">
              <Input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                placeholder={CUSTOM_LABEL}
              />
              <button
                type="button"
                onClick={submitCustom}
                className="shrink-0 rounded-md bg-brand-600 px-3 text-sm font-medium text-white"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
