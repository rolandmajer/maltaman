export type PropertyPricingType = "APARTMENT" | "HOUSE" | "OTHER" | "SHELL";

export type QuoteOptionalServicePreset = {
  code: string;
  name: string;
  description: string;
  pricingMode: "FIXED" | "PER_M2";
  price: number;
  minimumPrice?: number;
  requiresFullProtocol?: boolean;
};

export const DEFAULT_QUOTE_OPTIONAL_SERVICES: QuoteOptionalServicePreset[] = [
  {
    code: "FULL_PROTOCOL",
    name: "Kompletný protokol z obhliadky",
    description: "Podrobný miestnosť-po-miestnosti protokol s fotografiami, zisteniami, prioritami a odporúčaniami.",
    pricingMode: "PER_M2",
    price: 1.2,
    minimumPrice: 120,
  },
  { code: "REPAIR_ESTIMATE", name: "Orientačný odhad nákladov na opravy", description: "Položkový orientačný rozpočet odporúčaných opráv.", pricingMode: "FIXED", price: 75, requiresFullProtocol: true },
  { code: "THERMAL_APARTMENT", name: "Termovízna kontrola bytu", description: "Orientačné termovízne preverenie dostupných konštrukcií.", pricingMode: "FIXED", price: 60 },
  { code: "THERMAL_HOUSE", name: "Termovízna kontrola domu", description: "Orientačné termovízne preverenie dostupných konštrukcií domu.", pricingMode: "FIXED", price: 90 },
  { code: "MOISTURE", name: "Rozšírené meranie vlhkosti", description: "Meranie na viacerých rizikových miestach s uvedením výsledkov.", pricingMode: "FIXED", price: 35 },
  { code: "DRONE_ROOF", name: "Kontrola strechy dronom", description: "Vizuálna kontrola dostupných častí strechy z dronu, ak to podmienky a predpisy umožnia.", pricingMode: "FIXED", price: 80 },
  { code: "ATTIC", name: "Kontrola dostupného podkrovia", description: "Rozšírená kontrola bezpečne dostupného podkrovia.", pricingMode: "FIXED", price: 35 },
  { code: "CELLAR", name: "Kontrola pivnice alebo crawlspace", description: "Rozšírená kontrola bezpečne dostupného vedľajšieho priestoru.", pricingMode: "FIXED", price: 35 },
  { code: "GARAGE", name: "Kontrola samostatnej garáže", description: "Samostatná kontrola garáže mimo hlavnej podlahovej plochy.", pricingMode: "FIXED", price: 40 },
  { code: "DOCUMENTS", name: "Kontrola dokumentácie nehnuteľnosti", description: "Kontrola dostupných technických podkladov a dokumentov.", pricingMode: "FIXED", price: 45 },
  { code: "REVISION_REPORTS", name: "Kontrola revíznych správ", description: "Prehľad predložených revíznych správ a ich platnosti.", pricingMode: "FIXED", price: 35 },
  { code: "EXPRESS", name: "Expresný protokol do 24 hodín", description: "Prednostné spracovanie kompletného protokolu.", pricingMode: "FIXED", price: 60, requiresFullProtocol: true },
  { code: "CONSULTATION", name: "Dodatočná konzultácia", description: "Konzultácia nad rámec štandardného času.", pricingMode: "FIXED", price: 35 },
  { code: "PRINTED_COPY", name: "Dodatočná tlačená kópia", description: "Jedna zviazaná tlačená kópia protokolu.", pricingMode: "FIXED", price: 15, requiresFullProtocol: true },
  { code: "SECOND_LANGUAGE", name: "Druhá jazyková verzia", description: "Druhá jazyková verzia kompletného protokolu.", pricingMode: "FIXED", price: 60, requiresFullProtocol: true },
];

export const COMPLEXITY_FACTORS = [
  { code: "HEAVILY_FURNISHED", label: "Silne zariadená nehnuteľnosť", percent: 10 },
  { code: "FURNITURE_MOVEMENT", label: "Opakované presúvanie nábytku", percent: 20 },
  { code: "MULTI_FLOOR", label: "Viac ako dve kontrolované podlažia", percent: 10 },
  { code: "HISTORIC", label: "Historická alebo neštandardná konštrukcia", percent: 10 },
  { code: "EXTENSIONS", label: "Viac etáp výstavby alebo prístavby", percent: 10 },
  { code: "DETERIORATED", label: "Výrazne zhoršený stav", percent: 15 },
  { code: "MIXED_USE", label: "Zmiešané obytné a komerčné využitie", percent: 10 },
] as const;

export type TravelPricing = {
  freeUpToKm: number;
  bandTwoUpToKm: number;
  bandTwoPrice: number;
  bandThreeUpToKm: number;
  bandThreePrice: number;
  overBandRatePerKm: number;
};

export type QuotationLine = {
  kind: "REQUIRED" | "OPTIONAL";
  code: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  selected: boolean;
  order: number;
};

export function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function baseInspectionPrice(areaM2: number, ratePerM2: number, minimumPrice: number) {
  return roundMoney(Math.max(Math.max(0, areaM2) * Math.max(0, ratePerM2), Math.max(0, minimumPrice)));
}

export function complexityPercentFor(codes: string[]) {
  const unique = new Set(codes);
  const total = COMPLEXITY_FACTORS.reduce((sum, factor) => sum + (unique.has(factor.code) ? factor.percent : 0), 0);
  return Math.min(40, total);
}

export function travelPrice(returnDistanceKm: number, pricing: TravelPricing) {
  const km = Math.max(0, returnDistanceKm);
  if (km <= pricing.freeUpToKm) return 0;
  if (km <= pricing.bandTwoUpToKm) return roundMoney(pricing.bandTwoPrice);
  if (km <= pricing.bandThreeUpToKm) return roundMoney(pricing.bandThreePrice);
  return roundMoney(km * pricing.overBandRatePerKm);
}

export function optionalServicePrice(service: QuoteOptionalServicePreset, areaM2: number) {
  if (service.pricingMode === "FIXED") return roundMoney(service.price);
  return roundMoney(Math.max(Math.max(0, areaM2) * Math.max(0, service.price), service.minimumPrice ?? 0));
}

export function quotationTotals(
  lines: Array<Pick<QuotationLine, "selected" | "quantity" | "unitPrice">>,
  discountAmount: number,
  vatRatePercent: number,
  pricesIncludeVat: boolean,
) {
  const enteredSubtotal = roundMoney(lines.filter((line) => line.selected).reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice), 0));
  const enteredAfterDiscount = roundMoney(Math.max(0, enteredSubtotal - Math.max(0, discountAmount)));
  const rate = Math.max(0, vatRatePercent) / 100;
  const priceInclVat = pricesIncludeVat ? enteredAfterDiscount : roundMoney(enteredAfterDiscount * (1 + rate));
  const priceExclVat = pricesIncludeVat ? roundMoney(priceInclVat / (1 + rate)) : enteredAfterDiscount;
  return {
    subtotalEntered: enteredSubtotal,
    discountAmount: roundMoney(Math.min(Math.max(0, discountAmount), enteredSubtotal)),
    priceExclVat,
    vatAmount: roundMoney(priceInclVat - priceExclVat),
    priceInclVat,
  };
}

