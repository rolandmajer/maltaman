"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { AMENITY_CATEGORIES, AMENITY_CATEGORY_LABELS } from "@/lib/constants";

/** One place offered for adding — the shape both search modes return. */
export type AmenityCandidate = {
  name: string;
  distanceM: number;
  walkMinutes: number | null;
  driveMinutes: number | null;
  lat: number;
  lng: number;
};

function formatDistance(metres: number) {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1).replace(".", ",")} km` : `${metres} m`;
}

function formatTimes(walk: number | null, drive: number | null) {
  return (
    [walk != null ? `pešo ${walk} min` : null, drive != null ? `autom ${drive} min` : null]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

/**
 * Shared result list for both ways of adding a place: the name search at the top of the step and
 * each category's "find more nearby". Rendered as a popover so the list appears next to the button
 * that opened it rather than pushing the page around.
 */
export function AmenityResultList({
  candidates,
  loading,
  emptyLabel,
  showCategoryPicker,
  onAdd,
}: {
  candidates: AmenityCandidate[] | null;
  loading: boolean;
  emptyLabel: string;
  /** The name search doesn't know the category, so the technician chooses one per result. */
  showCategoryPicker?: boolean;
  onAdd: (candidate: AmenityCandidate, category: string) => void;
}) {
  const [category, setCategory] = useState(AMENITY_CATEGORIES[0].key);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const keyOf = (c: AmenityCandidate) => `${c.name}|${c.distanceM}`;

  if (loading) return <p className="px-1 py-2 text-sm text-slate-500">Hľadám…</p>;
  if (!candidates) return null;
  if (candidates.length === 0) return <p className="px-1 py-2 text-sm text-slate-500">{emptyLabel}</p>;

  return (
    <div className="flex flex-col gap-2">
      {showCategoryPicker && (
        <NativeSelectField label="Pridať do kategórie" value={category} onChange={setCategory}>
          {AMENITY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {AMENITY_CATEGORY_LABELS[c.key]}
            </option>
          ))}
        </NativeSelectField>
      )}
      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
        {candidates.map((candidate) => {
          const key = keyOf(candidate);
          const isAdded = added.has(key);
          return (
            <li key={key} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-800">{candidate.name}</p>
                <p className="text-xs text-slate-500">
                  {formatDistance(candidate.distanceM)} · {formatTimes(candidate.walkMinutes, candidate.driveMinutes)}
                </p>
              </div>
              <Button
                size="sm"
                variant={isAdded ? "ghost" : "outline"}
                disabled={isAdded}
                onClick={() => {
                  onAdd(candidate, category);
                  setAdded((prev) => new Set(prev).add(key));
                }}
              >
                {isAdded ? "Pridané" : <><Plus className="size-3.5" /> Pridať</>}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The name search at the top of the step: type a place, get nearby matches, add the right one. */
export function AmenityNameSearch({
  onSearch,
  onAdd,
  disabled,
}: {
  onSearch: (query: string) => Promise<AmenityCandidate[]>;
  onAdd: (candidate: AmenityCandidate, category: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<AmenityCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!query.trim()) return;
    setLoading(true);
    setCandidates(null);
    try {
      setCandidates(await onSearch(query));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
          placeholder="Napr. Kaufland, konkrétna ambulancia…"
          disabled={disabled}
        />
        <Button onClick={() => void run()} disabled={disabled || loading || !query.trim()}>
          <Search className="size-4" /> Hľadať
        </Button>
      </div>
      <AmenityResultList
        candidates={candidates}
        loading={loading}
        emptyLabel="Nič sa nenašlo v okolí nehnuteľnosti. Skúste iný názov."
        showCategoryPicker
        onAdd={onAdd}
      />
    </div>
  );
}

/** Each category's "Pridať": offers real nearby places first, with a blank row as a fallback. */
export function AmenityCategoryAdd({
  categoryKey,
  onFind,
  onAdd,
  onAddBlank,
}: {
  categoryKey: string;
  onFind: (categoryKey: string) => Promise<AmenityCandidate[]>;
  onAdd: (candidate: AmenityCandidate, category: string) => void;
  onAddBlank: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<AmenityCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setCandidates(null);
    try {
      setCandidates(await onFind(categoryKey));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Search on open so the technician sees options immediately rather than clicking twice.
        if (next && candidates === null && !loading) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Pridať
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500">
            Ďalšie miesta v okolí — {AMENITY_CATEGORY_LABELS[categoryKey]?.toLowerCase()}.
          </p>
          <AmenityResultList
            candidates={candidates}
            loading={loading}
            emptyLabel="Nič ďalšie sa v okolí nenašlo."
            onAdd={(candidate) => onAdd(candidate, categoryKey)}
          />
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
              Hľadať znova
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onAddBlank();
                setOpen(false);
              }}
            >
              Zadať ručne
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
