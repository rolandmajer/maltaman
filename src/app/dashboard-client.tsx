"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MapPin, Home as HomeIcon, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { apiGet, apiPost, cacheInspectionList, getCachedInspectionList } from "@/lib/offline/api-client";
import type { InspectionListItem } from "@/types/inspection";

const STATUS_LABELS: Record<string, string> = { DRAFT: "Koncept", COMPLETED: "Dokončená" };

export function DashboardClient({ initialInspections }: { initialInspections: InspectionListItem[] }) {
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionListItem[]>(initialInspections);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [creating, startCreating] = useTransition();
  const [offlineFallback, setOfflineFallback] = useState(false);

  useEffect(() => {
    void cacheInspectionList("list", initialInspections);
  }, [initialInspections]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "ALL") params.set("status", status);
    const url = `/api/inspections${params.toString() ? `?${params}` : ""}`;

    const timeout = setTimeout(() => {
      apiGet<InspectionListItem[]>(url)
        .then((data) => {
          setInspections(data);
          setOfflineFallback(false);
          if (!query && status === "ALL") void cacheInspectionList("list", data);
        })
        .catch(async () => {
          const cached = await getCachedInspectionList("list");
          if (cached) {
            setOfflineFallback(true);
            const list = cached.data as InspectionListItem[];
            setInspections(
              list.filter((i) => {
                const matchesStatus = status === "ALL" || i.status === status;
                const q = query.trim().toLowerCase();
                const matchesQuery =
                  !q ||
                  i.protocolNumber.toLowerCase().includes(q) ||
                  i.property?.address?.toLowerCase().includes(q) ||
                  i.property?.ownerName?.toLowerCase().includes(q);
                return matchesStatus && matchesQuery;
              })
            );
          }
        });
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, status]);

  const drafts = useMemo(() => inspections.filter((i) => i.status === "DRAFT"), [inspections]);
  const completed = useMemo(() => inspections.filter((i) => i.status === "COMPLETED"), [inspections]);

  function handleCreate() {
    startCreating(async () => {
      try {
        const created = await apiPost<{ id: string }>("/api/inspections", {}, "Nová obhliadka");
        router.push(`/obhliadky/${created.id}/zakladne-udaje`);
      } catch {
        toast.error("Na vytvorenie novej obhliadky je potrebné pripojenie na internet.");
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Obhliadky</h1>
        <Button size="lg" onClick={handleCreate} disabled={creating} className="w-full sm:w-auto">
          <Plus /> {creating ? "Vytváram…" : "Nová obhliadka"}
        </Button>
      </div>

      {offlineFallback && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Zobrazujú sa lokálne uložené dáta — bez pripojenia na internet.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hľadať podľa čísla protokolu, adresy, klienta…"
            className="pl-9"
            aria-label="Hľadať obhliadky"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Všetky stavy</SelectItem>
            <SelectItem value="DRAFT">Koncepty</SelectItem>
            <SelectItem value="COMPLETED">Dokončené</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status !== "COMPLETED" && (
        <Section title="Rozpracované obhliadky" items={drafts} emptyText="Žiadne rozpracované obhliadky" />
      )}
      {status !== "DRAFT" && (
        <Section title="Dokončené obhliadky" items={completed} emptyText="Zatiaľ žiadne dokončené obhliadky" />
      )}
    </div>
  );
}

function Section({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: InspectionListItem[];
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      )}
    </section>
  );
}

function InspectionCard({ inspection }: { inspection: InspectionListItem }) {
  const issueCount = inspection.findings.filter((f) => f.status === "V" || f.status === "R").length;
  const firstStep = inspection.status === "COMPLETED" ? "export" : "zakladne-udaje";

  return (
    <a
      href={`/obhliadky/${inspection.id}/${firstStep}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{inspection.protocolNumber}</p>
            <p className="flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPin className="size-3.5 shrink-0" />
              {inspection.property?.address || "Adresa nezadaná"}
              {inspection.property?.municipality ? `, ${inspection.property.municipality}` : ""}
            </p>
          </div>
          <Badge variant={inspection.status === "COMPLETED" ? "ok" : "secondary"}>
            {STATUS_LABELS[inspection.status]}
          </Badge>
        </div>
        <CardContent className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 p-0 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" /> {formatDate(inspection.inspectionDate)}
          </span>
          <span className="flex items-center gap-1">
            <HomeIcon className="size-3.5" /> {inspection.rooms.length} miestností
          </span>
          {issueCount > 0 && (
            <Badge variant="vada" className="font-normal">
              {issueCount}× zistenie
            </Badge>
          )}
          <span className="ml-auto font-medium text-slate-800">{formatCurrency(inspection.costTotalInclVat)}</span>
        </CardContent>
      </a>
  );
}
