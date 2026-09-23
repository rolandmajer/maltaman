"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Check, FileDown, Loader2, MapPin, Save, Send, Wrench } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/offline/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepSection } from "@/components/wizard/step-section";
import { formatCurrency, formatNumber, parseDecimalOr } from "@/lib/format";
import {
  baseInspectionPrice,
  COMPLEXITY_FACTORS,
  complexityPercentFor,
  DEFAULT_QUOTE_OPTIONAL_SERVICES,
  optionalServicePrice,
  quotationTotals,
  travelPrice,
  type PropertyPricingType,
  type QuoteOptionalServicePreset,
  type QuotationLine,
} from "@/lib/quotation-calculations";

type Customer = { id: string; name: string; email: string; phone: string };
type PricingSettings = {
  defaultVatRatePercent: number;
  pricingBaseAddress: string;
  apartmentRatePerM2: number; apartmentMinimumPrice: number;
  houseRatePerM2: number; houseMinimumPrice: number;
  otherRatePerM2: number; otherMinimumPrice: number;
  shellRatePerM2: number; shellMinimumPrice: number;
  fullProtocolRatePerM2: number; fullProtocolMinimum: number;
  travelFreeUpToKm: number; travelBandTwoUpToKm: number; travelBandTwoPrice: number;
  travelBandThreeUpToKm: number; travelBandThreePrice: number; travelOverBandRatePerKm: number;
  quoteOptionalServices: QuoteOptionalServicePreset[];
};

type QuoteResponse = {
  id: string; quoteNumber: string; status: string; customerId: string | null;
  clientName: string; clientEmail: string; clientPhone: string;
  propertyAddress: string; propertyType: PropertyPricingType; floorAreaM2: number; floors: number;
  baseRatePerM2: number; minimumPrice: number; complexityFactors: string[] | string;
  oneWayDistanceKm: number; returnDistanceKm: number; distanceManual: boolean; routeNote: string;
  discountAmount: number; pricesIncludeVat: boolean; notes: string; terms: string;
  lineItems: Array<QuotationLine & { id: string }>;
  inspection?: { id: string; protocolNumber: string } | null;
};

type FormState = {
  customerId: string; clientName: string; clientEmail: string; clientPhone: string;
  propertyAddress: string; propertyType: PropertyPricingType; floorAreaM2: number; floors: number;
  complexityFactors: string[]; oneWayDistanceKm: number; distanceManual: boolean; routeNote: string;
  selectedOptionalCodes: string[]; discountAmount: number; pricesIncludeVat: boolean; notes: string;
};

const EMPTY_FORM: FormState = {
  customerId: "", clientName: "", clientEmail: "", clientPhone: "", propertyAddress: "",
  propertyType: "APARTMENT", floorAreaM2: 0, floors: 1, complexityFactors: [], oneWayDistanceKm: 0,
  distanceManual: false, routeNote: "", selectedOptionalCodes: [], discountAmount: 0, pricesIncludeVat: true, notes: "",
};

const STATUS_LABELS: Record<string, string> = { DRAFT: "Koncept", SENT: "Odoslaná", AWAITING_SELECTION: "Čaká na výber", CLIENT_SELECTED: "Klient vybral", ACCEPTED: "Prijatá", REJECTED: "Odmietnutá", EXPIRED: "Expirovaná", CONVERTED: "Vytvorená obhliadka" };

function rateFor(type: PropertyPricingType, settings: PricingSettings) {
  if (type === "HOUSE") return { rate: settings.houseRatePerM2, minimum: settings.houseMinimumPrice, label: "Obhliadka rodinného domu" };
  if (type === "OTHER") return { rate: settings.otherRatePerM2, minimum: settings.otherMinimumPrice, label: "Obhliadka inej nehnuteľnosti" };
  if (type === "SHELL") return { rate: settings.shellRatePerM2, minimum: settings.shellMinimumPrice, label: "Obhliadka novostavby / holostavby" };
  return { rate: settings.apartmentRatePerM2, minimum: settings.apartmentMinimumPrice, label: "Obhliadka bytu" };
}

export function QuotationEditor({ quotationId }: { quotationId?: string }) {
  const router = useRouter();
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<PricingSettings>("/api/settings"),
      apiGet<Customer[]>("/api/crm/customers"),
      quotationId ? apiGet<QuoteResponse>(`/api/quotations/${quotationId}`) : Promise.resolve(null),
    ]).then(([loadedSettings, loadedCustomers, loadedQuote]) => {
      setSettings(loadedSettings);
      setCustomers(loadedCustomers);
      if (loadedQuote) {
        const factors = Array.isArray(loadedQuote.complexityFactors) ? loadedQuote.complexityFactors : JSON.parse(loadedQuote.complexityFactors || "[]");
        setQuote(loadedQuote);
        setForm({
          customerId: loadedQuote.customerId ?? "", clientName: loadedQuote.clientName, clientEmail: loadedQuote.clientEmail,
          clientPhone: loadedQuote.clientPhone, propertyAddress: loadedQuote.propertyAddress, propertyType: loadedQuote.propertyType,
          floorAreaM2: loadedQuote.floorAreaM2, floors: loadedQuote.floors, complexityFactors: factors,
          oneWayDistanceKm: loadedQuote.oneWayDistanceKm, distanceManual: loadedQuote.distanceManual, routeNote: loadedQuote.routeNote,
          selectedOptionalCodes: loadedQuote.lineItems.filter((line) => line.kind === "OPTIONAL" && line.selected).map((line) => line.code),
          discountAmount: loadedQuote.discountAmount, pricesIncludeVat: loadedQuote.pricesIncludeVat, notes: loadedQuote.notes,
        });
      }
    }).catch(() => toast.error("Cenovú ponuku sa nepodarilo načítať")).finally(() => setLoading(false));
  }, [quotationId]);

  const locked = quote?.status === "ACCEPTED" || quote?.status === "CONVERTED";

  const services = useMemo(() => {
    if (quote && ["ACCEPTED", "CONVERTED"].includes(quote.status)) return quote.lineItems.filter((line) => line.kind === "OPTIONAL").map((line) => ({ code: line.code, name: line.name, description: line.description ?? "", pricingMode: line.unit.includes("m²") ? "PER_M2" as const : "FIXED" as const, price: line.unitPrice, minimumPrice: line.unitPrice, requiresFullProtocol: DEFAULT_QUOTE_OPTIONAL_SERVICES.find((s) => s.code === line.code)?.requiresFullProtocol }));
    if (!settings) return DEFAULT_QUOTE_OPTIONAL_SERVICES;
    const base = settings.quoteOptionalServices?.length ? settings.quoteOptionalServices : DEFAULT_QUOTE_OPTIONAL_SERVICES;
    return base.map((service) => service.code === "FULL_PROTOCOL" ? { ...service, price: settings.fullProtocolRatePerM2, minimumPrice: settings.fullProtocolMinimum } : service);
  }, [quote, settings]);

  const preview = useMemo(() => {
    if (!settings) return null;
    const pricing = quote ? { rate: quote.baseRatePerM2, minimum: quote.minimumPrice, label: rateFor(form.propertyType, settings).label } : rateFor(form.propertyType, settings);
    const base = baseInspectionPrice(form.floorAreaM2, pricing.rate, pricing.minimum);
    const complexityPercent = complexityPercentFor(form.complexityFactors);
    const returnKm = Math.round(form.oneWayDistanceKm * 20) / 10;
    const travel = travelPrice(returnKm, { freeUpToKm: settings.travelFreeUpToKm, bandTwoUpToKm: settings.travelBandTwoUpToKm, bandTwoPrice: settings.travelBandTwoPrice, bandThreeUpToKm: settings.travelBandThreeUpToKm, bandThreePrice: settings.travelBandThreePrice, overBandRatePerKm: settings.travelOverBandRatePerKm });
    const required: QuotationLine[] = [
      { kind: "REQUIRED", code: "BASE_INSPECTION", name: pricing.label, description: `${form.floorAreaM2} m² × ${pricing.rate.toFixed(2)} €/m²`, quantity: 1, unit: "paušál", unitPrice: base, selected: true, order: 0 },
      ...(complexityPercent ? [{ kind: "REQUIRED" as const, code: "COMPLEXITY", name: `Príplatok za náročnosť (+${complexityPercent} %)`, description: "", quantity: 1, unit: "paušál", unitPrice: Math.round(base * complexityPercent) / 100, selected: true, order: 1 }] : []),
      { kind: "REQUIRED", code: "TRAVEL", name: `Cestovné (${formatNumber(returnKm, 1)} km tam aj späť)`, description: "", quantity: 1, unit: "paušál", unitPrice: travel, selected: true, order: 2 },
    ];
    const optional = services.map((service, order): QuotationLine => ({ kind: "OPTIONAL", code: service.code, name: service.name, description: service.description, quantity: 1, unit: service.pricingMode === "PER_M2" ? `${form.floorAreaM2} m²` : "paušál", unitPrice: locked ? service.price : optionalServicePrice(service, form.floorAreaM2), selected: form.selectedOptionalCodes.includes(service.code), order: 100 + order }));
    const lines = [...required, ...optional];
    return { required, optional, totals: quotationTotals(lines, form.discountAmount, settings.defaultVatRatePercent, form.pricesIncludeVat), complexityPercent, returnKm };
  }, [form, locked, quote, services, settings]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((previous) => ({ ...previous, [key]: value })); }

  function toggleFactor(code: string) {
    setForm((previous) => {
      let next = previous.complexityFactors.includes(code) ? previous.complexityFactors.filter((item) => item !== code) : [...previous.complexityFactors, code];
      if (code === "HEAVILY_FURNISHED" && next.includes(code)) next = next.filter((item) => item !== "FURNITURE_MOVEMENT");
      if (code === "FURNITURE_MOVEMENT" && next.includes(code)) next = next.filter((item) => item !== "HEAVILY_FURNISHED");
      return { ...previous, complexityFactors: next };
    });
  }

  function toggleService(service: QuoteOptionalServicePreset) {
    setForm((previous) => {
      const selected = new Set(previous.selectedOptionalCodes);
      if (selected.has(service.code)) selected.delete(service.code); else selected.add(service.code);
      if (service.requiresFullProtocol && selected.has(service.code)) {
        selected.add("FULL_PROTOCOL");
        toast.info("Táto služba vyžaduje kompletný protokol, preto bol pridaný automaticky.");
      }
      if (service.code === "FULL_PROTOCOL" && !selected.has("FULL_PROTOCOL")) {
        services.filter((item) => item.requiresFullProtocol).forEach((item) => selected.delete(item.code));
      }
      return { ...previous, selectedOptionalCodes: [...selected] };
    });
  }

  async function save() {
    if (!form.clientName.trim() || !form.propertyAddress.trim() || form.floorAreaM2 <= 0) {
      toast.error("Zadajte klienta, adresu a podlahovú plochu."); return null;
    }
    setSaving(true);
    try {
      const body = { ...form, customerId: form.customerId || null };
      const saved = quotationId ? await apiPatch<QuoteResponse>(`/api/quotations/${quotationId}`, body) : await apiPost<QuoteResponse>("/api/quotations", body, "Vytvorenie cenovej ponuky");
      setQuote({ ...saved, complexityFactors: Array.isArray(saved.complexityFactors) ? saved.complexityFactors : JSON.parse(saved.complexityFactors || "[]") });
      toast.success("Cenová ponuka bola uložená");
      if (!quotationId) router.replace(`/cenove-ponuky/${saved.id}`);
      router.refresh();
      return saved;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Uloženie zlyhalo"); return null; }
    finally { setSaving(false); }
  }

  async function setStatus(status: "SENT" | "ACCEPTED") {
    if (!quote) return;
    if (!form.clientName.trim() || !form.propertyAddress.trim() || form.floorAreaM2 <= 0) {
      toast.error("Zadajte klienta, adresu a podlahovú plochu."); return;
    }
    setSaving(true);
    try {
      // Persist the visible calculator first, then change only the status. The second request
      // freezes exactly the prices the technician saw when accepting the offer.
      await apiPatch<QuoteResponse>(`/api/quotations/${quote.id}`, { ...form, customerId: form.customerId || null });
      const saved = await apiPatch<QuoteResponse>(`/api/quotations/${quote.id}`, { status });
      setQuote({ ...saved, complexityFactors: Array.isArray(saved.complexityFactors) ? saved.complexityFactors : JSON.parse(saved.complexityFactors || "[]") });
      toast.success(status === "SENT" ? "Ponuka bola označená ako odoslaná" : "Ponuka bola prijatá a jej cena je uzamknutá");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Zmena stavu zlyhala"); }
    finally { setSaving(false); }
  }

  async function calculateDistance() {
    if (!form.propertyAddress.trim()) { toast.error("Najskôr zadajte adresu nehnuteľnosti."); return; }
    setRouting(true);
    try {
      const result = await apiPost<{ oneWayDistanceKm: number; returnDistanceKm: number; originLabel: string; destinationLabel: string }>("/api/quotations/calculate-distance", { destination: form.propertyAddress }, "Výpočet trasy");
      setForm((previous) => ({ ...previous, oneWayDistanceKm: result.oneWayDistanceKm, distanceManual: false, routeNote: `${result.originLabel} → ${result.destinationLabel}` }));
      toast.success(`Trasa: ${formatNumber(result.returnDistanceKm, 1)} km tam aj späť`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Trasu sa nepodarilo vypočítať"); }
    finally { setRouting(false); }
  }

  async function convert() {
    if (!quote) return;
    try {
      const inspection = await apiPost<{ id: string }>(`/api/quotations/${quote.id}/convert`, {}, "Vytvorenie obhliadky");
      router.push(`/obhliadky/${inspection.id}/zakladne-udaje`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Vytvorenie obhliadky zlyhalo"); }
  }

  if (loading || !settings || !preview) return <main className="mx-auto max-w-5xl p-4"><p className="text-sm text-slate-500">Načítavam kalkulátor…</p></main>;

  return (
    <main className="mx-auto max-w-5xl p-4 pb-28">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{quote?.quoteNumber ?? "Nová cenová ponuka"}</h1>{quote && <Badge variant="secondary">{STATUS_LABELS[quote.status]}</Badge>}</div><p className="text-sm text-slate-500">Kalkulácia obhliadky a samostatne voliteľných služieb.</p></div>
        {quote && <a href={`/api/quotations/${quote.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="outline"><FileDown /> Náhľad PDF</Button></a>}
      </div>

      <fieldset disabled={locked} className="space-y-4 disabled:opacity-80">
        <StepSection title="Klient a nehnuteľnosť">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Existujúci klient</Label><Select value={form.customerId || "none"} onValueChange={(value) => { const customer = customers.find((item) => item.id === value); setForm((previous) => ({ ...previous, customerId: value === "none" ? "" : value, ...(customer ? { clientName: customer.name, clientEmail: customer.email, clientPhone: customer.phone } : {}) })); }}><SelectTrigger><SelectValue placeholder="Vyberte klienta" /></SelectTrigger><SelectContent><SelectItem value="none">Bez prepojenia</SelectItem>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name || customer.email}</SelectItem>)}</SelectContent></Select></div>
            <Field label="Meno klienta"><Input value={form.clientName} onChange={(e) => update("clientName", e.target.value)} /></Field>
            <Field label="E-mail"><Input type="email" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} /></Field>
            <Field label="Telefón"><Input value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} /></Field>
            <Field label="Typ nehnuteľnosti"><Select value={form.propertyType} onValueChange={(value) => update("propertyType", value as PropertyPricingType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="APARTMENT">Byt</SelectItem><SelectItem value="HOUSE">Rodinný dom</SelectItem><SelectItem value="SHELL">Novostavba / holostavba</SelectItem><SelectItem value="OTHER">Komerčná / iná</SelectItem></SelectContent></Select></Field>
            <Field label="Adresa nehnuteľnosti" className="sm:col-span-2"><Input value={form.propertyAddress} onChange={(e) => update("propertyAddress", e.target.value)} placeholder="Ulica, číslo, obec, PSČ" /></Field>
            <Field label="Podlahová plocha (m²)"><Input type="number" min="0" step="0.1" value={form.floorAreaM2 || ""} onChange={(e) => update("floorAreaM2", parseDecimalOr(e.target.value))} /></Field>
            <Field label="Počet podlaží"><Input type="number" min="1" value={form.floors} onChange={(e) => { const floors = Math.max(1, Math.round(parseDecimalOr(e.target.value, 1))); setForm((previous) => ({ ...previous, floors, complexityFactors: floors > 2 ? [...new Set([...previous.complexityFactors, "MULTI_FLOOR"])] : previous.complexityFactors.filter((item) => item !== "MULTI_FLOOR") })); }} /></Field>
          </div>
        </StepSection>

        <StepSection title="Náročnosť obhliadky" description={`Súčet príplatkov je zastropovaný na 40 %. Aktuálne: ${preview.complexityPercent} %.`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {COMPLEXITY_FACTORS.map((factor) => <label key={factor.code} className={`flex items-start gap-3 rounded-lg border border-slate-200 p-3 ${factor.code === "MULTI_FLOOR" ? "cursor-default bg-slate-50" : "cursor-pointer"}`}><Checkbox checked={form.complexityFactors.includes(factor.code)} disabled={factor.code === "MULTI_FLOOR"} onCheckedChange={() => toggleFactor(factor.code)} /><span className="text-sm"><strong>{factor.label}</strong><span className="ml-1 text-slate-500">+{factor.percent} %{factor.code === "MULTI_FLOOR" ? " · automaticky podľa počtu podlaží" : ""}</span></span></label>)}
          </div>
        </StepSection>

        <StepSection title="Cestovné" description={`Východisková adresa: ${settings.pricingBaseAddress}. Vzdialenosť sa účtuje tam aj späť.`}>
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Vzdialenosť jedným smerom (km)"><Input type="number" min="0" step="0.1" value={form.oneWayDistanceKm || ""} onChange={(e) => setForm((previous) => ({ ...previous, oneWayDistanceKm: parseDecimalOr(e.target.value), distanceManual: true }))} /></Field>
            <Button type="button" variant="outline" onClick={() => void calculateDistance()} disabled={routing}>{routing ? <Loader2 className="animate-spin" /> : <MapPin />} Vypočítať trasu</Button>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{formatNumber(preview.returnKm, 1)} km tam aj späť</strong> · cestovné {formatCurrency(preview.required.find((line) => line.code === "TRAVEL")?.unitPrice ?? 0)}{form.distanceManual && <span className="ml-2 text-amber-700">Ručne zadané</span>}</div>
        </StepSection>

        <StepSection title="Voliteľné služby" description="Klient si môže vybrať ľubovoľné služby. Nevybrané položky zostanú viditeľné v PDF, ale nezapočítajú sa do ceny.">
          <div className="space-y-2">{preview.optional.map((line) => { const service = services.find((item) => item.code === line.code)!; return <label key={line.code} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${line.selected ? "border-red-300 bg-red-50/40" : "border-slate-200"}`}><Checkbox checked={line.selected} onCheckedChange={() => toggleService(service)} /><span className="min-w-0 flex-1"><span className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{line.name}</strong><strong className="text-sm">{formatCurrency(line.unitPrice)}</strong></span><span className="mt-1 block text-xs text-slate-500">{line.description}</span>{service.requiresFullProtocol && <span className="mt-1 block text-xs text-amber-700">Vyžaduje kompletný protokol</span>}</span></label>; })}</div>
        </StepSection>

        <StepSection title="Súhrn ceny">
          <PriceRows lines={preview.required} title="Povinná časť" />
          <PriceRows lines={preview.optional.filter((line) => line.selected)} title="Vybrané voliteľné služby" empty="Klient zatiaľ nevybral žiadnu voliteľnú službu." />
          <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <Field label="Zľava (€)"><Input type="number" min="0" step="0.01" value={form.discountAmount || ""} onChange={(e) => update("discountAmount", parseDecimalOr(e.target.value))} /></Field>
            <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 p-3"><Checkbox checked={form.pricesIncludeVat} onCheckedChange={(checked) => update("pricesIncludeVat", checked === true)} /><span className="text-sm">Zadané ceny sú s DPH</span></label>
          </div>
          <div className="rounded-xl bg-slate-900 p-4 text-white"><div className="flex justify-between text-sm text-slate-300"><span>Bez DPH</span><span>{formatCurrency(preview.totals.priceExclVat)}</span></div><div className="flex justify-between text-sm text-slate-300"><span>DPH</span><span>{formatCurrency(preview.totals.vatAmount)}</span></div><div className="mt-2 flex justify-between border-t border-slate-700 pt-3 text-xl font-bold"><span>Celkom</span><span>{formatCurrency(preview.totals.priceInclVat)}</span></div></div>
          <Field label="Poznámka pre klienta"><textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></Field>
        </StepSection>
      </fieldset>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur"><div className="mx-auto flex max-w-5xl flex-wrap justify-end gap-2">
        {!locked && <Button variant="outline" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Uložiť</Button>}
        {quote && quote.status === "DRAFT" && <Button variant="outline" onClick={() => void setStatus("SENT")} disabled={saving}><Send /> Označiť ako odoslanú</Button>}
        {quote && !["ACCEPTED", "CONVERTED"].includes(quote.status) && <Button onClick={() => void setStatus("ACCEPTED")} disabled={saving}><Check /> Klient prijal</Button>}
        {quote?.status === "ACCEPTED" && <Button onClick={() => void convert()}><Wrench /> Vytvoriť obhliadku</Button>}
        {quote?.inspection && <Button onClick={() => router.push(`/obhliadky/${quote.inspection!.id}/zakladne-udaje`)}><Wrench /> Otvoriť obhliadku</Button>}
      </div></div>
    </main>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={`flex flex-col gap-1.5 ${className ?? ""}`}><Label>{label}</Label>{children}</div>; }
function PriceRows({ lines, title, empty }: { lines: QuotationLine[]; title: string; empty?: string }) { return <div className="mb-4"><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>{lines.length === 0 ? <p className="text-sm text-slate-400">{empty}</p> : <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">{lines.map((line) => <div key={line.code} className="flex justify-between gap-3 p-3 text-sm"><span><strong>{line.name}</strong>{line.description && <small className="mt-0.5 block text-slate-500">{line.description}</small>}</span><strong className="shrink-0">{formatCurrency(line.quantity * line.unitPrice)}</strong></div>)}</div>}</div>; }
