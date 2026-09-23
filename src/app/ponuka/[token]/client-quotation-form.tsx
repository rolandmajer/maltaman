"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPLEXITY_FACTORS, type PropertyPricingType } from "@/lib/quotation-calculations";
import { parseDecimalOr } from "@/lib/format";

type Service = { code: string; name: string; description: string; requiresFullProtocol: boolean };
type FormData = {
  clientName: string; clientEmail: string; clientPhone: string;
  propertyAddress: string; propertyType: PropertyPricingType; floorAreaM2: number; floors: number;
  complexityFactors: string[]; selectedOptionalCodes: string[]; notes: string; optionalServices: Service[];
};

export function ClientQuotationForm({ token }: { token: string }) {
  const [form, setForm] = useState<FormData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/public/quotation-form/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Formulár sa nepodarilo načítať");
        return body as FormData;
      })
      .then(setForm)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Formulár sa nepodarilo načítať"));
  }, [token]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((previous) => previous ? { ...previous, [key]: value } : previous);
  }

  function toggleFactor(code: string) {
    if (!form || code === "MULTI_FLOOR") return;
    let next = form.complexityFactors.includes(code) ? form.complexityFactors.filter((item) => item !== code) : [...form.complexityFactors, code];
    if (code === "HEAVILY_FURNISHED" && next.includes(code)) next = next.filter((item) => item !== "FURNITURE_MOVEMENT");
    if (code === "FURNITURE_MOVEMENT" && next.includes(code)) next = next.filter((item) => item !== "HEAVILY_FURNISHED");
    update("complexityFactors", next);
  }

  function toggleService(service: Service) {
    if (!form) return;
    const selected = new Set(form.selectedOptionalCodes);
    if (selected.has(service.code)) selected.delete(service.code); else selected.add(service.code);
    if (service.requiresFullProtocol && selected.has(service.code)) selected.add("FULL_PROTOCOL");
    if (service.code === "FULL_PROTOCOL" && !selected.has("FULL_PROTOCOL")) {
      form.optionalServices.filter((item) => item.requiresFullProtocol).forEach((item) => selected.delete(item.code));
    }
    update("selectedOptionalCodes", [...selected]);
  }

  async function submit() {
    if (!form) return;
    const missing = [
      !form.clientName.trim() ? "meno a priezvisko" : null,
      !form.clientEmail.trim() ? "e-mail" : null,
      !form.clientPhone.trim() ? "telefón" : null,
      !form.propertyAddress.trim() ? "adresu nehnuteľnosti" : null,
      form.floorAreaM2 <= 0 ? "podlahovú plochu" : null,
    ].filter(Boolean);
    if (missing.length) { setError(`Doplňte: ${missing.join(", ")}.`); return; }
    setSaving(true);
    setError("");
    try {
      const { optionalServices, ...body } = form;
      void optionalServices;
      const response = await fetch(`/api/public/quotation-form/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Formulár sa nepodarilo odoslať");
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Formulár sa nepodarilo odoslať");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) return <PublicShell><div className="py-16 text-center"><CheckCircle2 className="mx-auto mb-4 size-14 text-emerald-600" /><h1 className="text-2xl font-bold">Ďakujeme, údaje boli odoslané</h1><p className="mx-auto mt-3 max-w-md text-slate-600">MALTAMAN vaše údaje skontroluje a následne vám pošle finálnu cenovú ponuku.</p></div></PublicShell>;
  if (error && !form) return <PublicShell><div className="py-16 text-center"><h1 className="text-xl font-bold">Formulár nie je dostupný</h1><p className="mt-3 text-slate-600">{error}</p></div></PublicShell>;
  if (!form) return <PublicShell><div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="mr-2 animate-spin" /> Načítavam formulár…</div></PublicShell>;

  return <PublicShell>
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">Podklady pre cenovú ponuku</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Obhliadka nehnuteľnosti</h1><p className="mt-3 max-w-2xl text-slate-600">Vyplňte údaje o nehnuteľnosti a označte doplnkové služby, o ktoré máte záujem. Pred odoslaním cenovej ponuky všetko skontrolujeme.</p></div>
    <Section title="Kontaktné údaje"><div className="grid gap-4 sm:grid-cols-2"><Field label="Meno a priezvisko"><Input value={form.clientName} onChange={(event) => update("clientName", event.target.value)} /></Field><Field label="E-mail"><Input type="email" value={form.clientEmail} onChange={(event) => update("clientEmail", event.target.value)} /></Field><Field label="Telefón"><Input value={form.clientPhone} onChange={(event) => update("clientPhone", event.target.value)} /></Field></div></Section>
    <Section title="Nehnuteľnosť"><div className="grid gap-4 sm:grid-cols-2"><Field label="Typ nehnuteľnosti"><Select value={form.propertyType} onValueChange={(value) => update("propertyType", value as PropertyPricingType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="APARTMENT">Byt</SelectItem><SelectItem value="HOUSE">Rodinný dom</SelectItem><SelectItem value="SHELL">Novostavba / holostavba</SelectItem><SelectItem value="OTHER">Komerčná / iná nehnuteľnosť</SelectItem></SelectContent></Select></Field><Field label="Podlahová plocha (m²)"><Input type="number" min="0" step="0.1" value={form.floorAreaM2 || ""} onChange={(event) => update("floorAreaM2", parseDecimalOr(event.target.value))} /></Field><Field label="Počet podlaží"><Input type="number" min="1" value={form.floors} onChange={(event) => update("floors", Math.max(1, Math.round(parseDecimalOr(event.target.value, 1))))} /></Field><Field label="Adresa nehnuteľnosti" className="sm:col-span-2"><Input value={form.propertyAddress} onChange={(event) => update("propertyAddress", event.target.value)} placeholder="Ulica, číslo, obec, PSČ" /></Field></div></Section>
    <Section title="Čo môže ovplyvniť obhliadku" description="Označte všetko, čo sa týka nehnuteľnosti."><div className="grid gap-2 sm:grid-cols-2">{COMPLEXITY_FACTORS.filter((factor) => factor.code !== "MULTI_FLOOR").map((factor) => <label key={factor.code} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3"><Checkbox checked={form.complexityFactors.includes(factor.code)} onCheckedChange={() => toggleFactor(factor.code)} /><span className="text-sm font-medium">{factor.label}</span></label>)}</div></Section>
    <Section title="Doplnkové služby" description="Vyberte služby, o ktoré máte záujem. Ich cenu potvrdíme vo finálnej ponuke."><div className="space-y-2">{form.optionalServices.map((service) => <label key={service.code} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${form.selectedOptionalCodes.includes(service.code) ? "border-brand-300 bg-brand-50" : "border-slate-200"}`}><Checkbox checked={form.selectedOptionalCodes.includes(service.code)} onCheckedChange={() => toggleService(service)} /><span><strong className="text-sm">{service.name}</strong><span className="mt-1 block text-xs text-slate-500">{service.description}</span>{service.requiresFullProtocol && <span className="mt-1 block text-xs text-amber-700">Vyžaduje kompletný protokol</span>}</span></label>)}</div></Section>
    <Section title="Poznámka"><textarea className="min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Doplňujúce informácie, dostupnosť, želaný termín…" /></Section>
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Button className="h-12 w-full text-base" onClick={() => void submit()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Send />} Odoslať údaje</Button>
    <p className="mt-3 text-center text-xs text-slate-500">Odoslaním formulára nevzniká záväzná objednávka. Finálnu cenu vám potvrdíme samostatne.</p>
  </PublicShell>;
}

function PublicShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12"><div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-sm sm:p-9"><div className="mb-8 border-b border-slate-200 pb-5 text-xl font-black tracking-tight">MALTAMAN</div>{children}</div></main>; }
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="mb-5 rounded-xl border border-slate-200 p-4 sm:p-5"><h2 className="text-lg font-bold">{title}</h2>{description && <p className="mb-4 mt-1 text-sm text-slate-500">{description}</p>}<div className={description ? "" : "mt-4"}>{children}</div></section>; }
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={`flex flex-col gap-1.5 ${className ?? ""}`}><Label>{label}</Label>{children}</div>; }
