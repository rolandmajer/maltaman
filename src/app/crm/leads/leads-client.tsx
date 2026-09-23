"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calculator, Mail, MapPin, Phone, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPatch, apiPost } from "@/lib/offline/api-client";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_QUOTE_OPTIONAL_SERVICES } from "@/lib/quotation-calculations";

const STATUS_LABELS = {
  NEW: "Nový",
  CONTACTED: "Kontaktovaný",
  QUALIFIED: "Kvalifikovaný",
  BOOKED: "Objednaný",
  WON: "Získaný",
  LOST: "Stratený",
} as const;

const SOURCE_LABELS = {
  CHECKLIST: "Checklist",
  WEBSITE: "Web",
  REFERRAL: "Odporúčanie",
  MANUAL: "Ručne",
  OTHER: "Iné",
} as const;

type LeadStatus = keyof typeof STATUS_LABELS;
type LeadSource = keyof typeof SOURCE_LABELS;

const SERVICE_LABELS: Record<string, string> = {
  byt: "Obhliadka bytu",
  dom: "Obhliadka domu",
  novostavba: "Preberanie novostavby",
  rekonstrukcia: "Konzultácia pred rekonštrukciou",
  kontrola_ponuky: "Kontrola cenovej ponuky",
};

export type LeadDto = {
  id: string;
  status: LeadStatus;
  source: LeadSource;
  propertyAddress: string;
  propertyType: string;
  requestedService: string;
  floorAreaM2: number;
  requestedOptionalCodes: string[];
  message: string;
  nextActionAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone: string };
  inspection: { id: string; protocolNumber: string } | null;
  quotation: { id: string; quoteNumber: string } | null;
};

export function LeadsClient({ initialLeads }: { initialLeads: LeadDto[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<LeadStatus | "ALL">("ALL");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", propertyAddress: "" });

  const visible = useMemo(
    () => leads.filter((lead) => filter === "ALL" || lead.status === filter),
    [leads, filter]
  );

  async function addLead(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await apiPost<LeadDto>(
        "/api/crm/leads",
        { ...form, source: "MANUAL" },
        "Nový CRM lead"
      );
      setLeads((items) => [created, ...items]);
      toast.success("Lead bol vytvorený");
      setForm({ name: "", email: "", phone: "", propertyAddress: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lead sa nepodarilo vytvoriť");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: LeadStatus) {
    const previous = leads;
    setLeads((items) => items.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    try {
      await apiPatch(`/api/crm/leads/${id}`, { status }, "Zmena stavu leadu");
    } catch (error) {
      setLeads(previous);
      toast.error(error instanceof Error ? error.message : "Stav sa nepodarilo uložiť");
    }
  }

  async function convert(id: string) {
    try {
      const result = await apiPost<{ inspectionId: string }>(
        `/api/crm/leads/${id}/convert`,
        {},
        "Vytvorenie obhliadky z leadu"
      );
      router.push(`/obhliadky/${result.inspectionId}/zakladne-udaje`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Obhliadku sa nepodarilo vytvoriť");
    }
  }

  async function createQuotation(id: string) {
    try {
      const result = await apiPost<{ quotationId: string }>(
        `/api/crm/leads/${id}/quotation`,
        {},
        "Vytvorenie cenovej ponuky z leadu"
      );
      router.push(`/cenove-ponuky/${result.quotationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cenovú ponuku sa nepodarilo vytvoriť");
    }
  }

  async function deleteLead(id: string) {
    try {
      await apiDelete(`/api/crm/leads/${id}`, "Odstránenie CRM leadu");
      setLeads((items) => items.filter((lead) => lead.id !== id));
      toast.success("Lead bol vymazaný");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lead sa nepodarilo vymazať");
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Leady</h1>
        <p className="text-sm text-slate-500">Dopyty z checklistu, webu a ručne pridané kontakty.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Pridať lead</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addLead} className="grid gap-3 sm:grid-cols-2">
            <Input aria-label="Meno klienta" placeholder="Meno klienta" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input required type="email" aria-label="E-mail klienta" placeholder="E-mail"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input aria-label="Telefón klienta" placeholder="Telefón" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input aria-label="Adresa nehnuteľnosti" placeholder="Adresa nehnuteľnosti"
              value={form.propertyAddress} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} />
            <Button type="submit" disabled={saving} className="sm:col-span-2 sm:justify-self-start">
              <Plus /> {saving ? "Ukladám…" : "Pridať lead"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{visible.length} záznamov</p>
        <Select value={filter} onValueChange={(value) => setFilter(value as LeadStatus | "ALL")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Všetky stavy</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {visible.map((lead) => (
          <Card key={lead.id}>
            <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_190px_auto] md:items-center">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{lead.customer.name || lead.customer.email}</p>
                  <Badge variant="secondary">{SOURCE_LABELS[lead.source]}</Badge>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-slate-600"><Mail className="size-4" /> {lead.customer.email}</p>
                {lead.customer.phone && <p className="flex items-center gap-1.5 text-sm text-slate-600"><Phone className="size-4" /> {lead.customer.phone}</p>}
                {lead.propertyAddress && <p className="flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="size-4" /> {lead.propertyAddress}</p>}
                {(lead.requestedService || lead.floorAreaM2 > 0) && <p className="pt-1 text-sm font-medium text-slate-700">
                  {SERVICE_LABELS[lead.requestedService] ?? lead.requestedService}{lead.floorAreaM2 > 0 ? ` · ${lead.floorAreaM2} m²` : ""}
                </p>}
                {lead.requestedOptionalCodes.length > 0 && <div className="flex flex-wrap gap-1 pt-1">
                  {lead.requestedOptionalCodes.map((code) => <Badge key={code} variant="outline">
                    {DEFAULT_QUOTE_OPTIONAL_SERVICES.find((service) => service.code === code)?.name ?? code}
                  </Badge>)}
                </div>}
                {lead.message && <p className="pt-1 text-sm text-slate-500">{lead.message}</p>}
              </div>
              <Select value={lead.status} onValueChange={(value) => updateStatus(lead.id, value as LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap justify-end gap-2">
                {lead.quotation ? (
                  <Button variant="outline" onClick={() => router.push(`/cenove-ponuky/${lead.quotation!.id}`)}>
                    {lead.quotation.quoteNumber} <ArrowRight />
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void createQuotation(lead.id)}><Calculator /> Vytvoriť ponuku</Button>
                )}
                {lead.inspection ? (
                  <Button variant="outline" onClick={() => router.push(`/obhliadky/${lead.inspection!.id}/zakladne-udaje`)}>
                    {lead.inspection.protocolNumber} <ArrowRight />
                  </Button>
                ) : (
                  <Button onClick={() => convert(lead.id)}><UserRound /> Vytvoriť obhliadku</Button>
                )}
                <ConfirmDeleteButton
                  title="Vymazať CRM lead?"
                  description={lead.inspection ? "Lead sa odstráni, ale už vytvorený protokol a prípadné cenové ponuky zostanú zachované." : "Lead sa natrvalo odstráni. Klient a prípadné cenové ponuky zostanú zachované."}
                  onConfirm={() => void deleteLead(lead.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Žiadne leady v tomto stave.</p>}
      </div>
    </main>
  );
}
