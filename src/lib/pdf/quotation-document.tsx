import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { colors } from "@/lib/pdf/styles";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { quotationTotals } from "@/lib/quotation-calculations";

const q = StyleSheet.create({
  page: { fontFamily: "Plex", fontSize: 9, color: colors.ink, paddingTop: 38, paddingBottom: 42, paddingHorizontal: 43 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 3, borderBottomColor: colors.brand, paddingBottom: 16, marginBottom: 22 },
  logo: { width: 122, height: 28, objectFit: "contain", objectPosition: "left center" },
  title: { fontFamily: "Archivo", fontWeight: 900, fontSize: 23, color: colors.ink },
  subtitle: { fontFamily: "PlexMono", color: colors.brand, fontWeight: 700, fontSize: 8, marginTop: 4 },
  grid: { flexDirection: "row", gap: 12, marginBottom: 18 },
  card: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 },
  label: { fontFamily: "PlexMono", fontSize: 7, color: colors.muted, marginBottom: 3, textTransform: "uppercase" },
  value: { fontSize: 9.5, fontWeight: 600, marginBottom: 7 },
  sectionTitle: { fontFamily: "Archivo", fontWeight: 800, fontSize: 13, borderBottomWidth: 1.5, borderBottomColor: colors.ink, paddingBottom: 6, marginTop: 5, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 7 },
  rowMuted: { backgroundColor: colors.surfaceAlt, color: colors.muted },
  check: { width: 22, fontFamily: "PlexMono", fontWeight: 700 },
  item: { flex: 1, paddingRight: 10 },
  itemName: { fontWeight: 600 },
  description: { fontSize: 7.5, color: colors.muted, marginTop: 2 },
  price: { width: 78, textAlign: "right", fontFamily: "PlexMono", fontWeight: 700 },
  totalBox: { marginTop: 14, marginLeft: "auto", width: 250, backgroundColor: colors.ink, color: colors.white, borderRadius: 8, padding: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, color: "#d8d3ce" },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#6b6560", paddingTop: 8, marginTop: 5, fontFamily: "Archivo", fontWeight: 800, fontSize: 15, color: colors.white },
  note: { marginTop: 13, padding: 10, borderRadius: 7, backgroundColor: colors.surface, fontSize: 8, color: colors.body, lineHeight: 1.5 },
  signature: { flexDirection: "row", gap: 30, marginTop: 38 },
  signatureLine: { flex: 1, borderTopWidth: 1, borderTopColor: colors.muted, paddingTop: 5, fontSize: 7.5, color: colors.muted, textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 43, right: 43, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, fontSize: 7, color: colors.faint },
});

type QuotationPdf = {
  quoteNumber: string; status: string; issuedAt: Date; validUntil: Date | null;
  clientName: string; clientEmail: string; clientPhone: string;
  propertyAddress: string; propertyType: string; floorAreaM2: number; floors: number;
  routeOrigin: string; oneWayDistanceKm: number; returnDistanceKm: number; distanceManual: boolean;
  complexityDescription: string; discountAmount: number; vatRatePercent: number; pricesIncludeVat: boolean;
  notes: string; terms: string;
  lineItems: Array<{ id: string; kind: string; code: string; name: string; description: string; quantity: number; unit: string; unitPrice: number; selected: boolean; order: number }>;
};

type Settings = { companyName: string; companyTagline: string; companyAddress: string; companyIco: string; companyDic: string; companyPhone: string; companyEmail: string; companyWeb: string };

const PROPERTY_LABELS: Record<string, string> = { APARTMENT: "Byt", HOUSE: "Rodinný dom", SHELL: "Novostavba / holostavba", OTHER: "Komerčná / iná nehnuteľnosť" };

function PdfFooter({ quote, company }: { quote: QuotationPdf; company: string }) {
  return <View style={q.footer} fixed><Text>{quote.quoteNumber} · {company}</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>;
}

function LineRows({ lines, optional = false }: { lines: QuotationPdf["lineItems"]; optional?: boolean }) {
  return <View>{lines.map((line) => <View key={line.id} style={[q.row, optional && !line.selected ? q.rowMuted : {}]} wrap={false}>
    {optional && <Text style={q.check}>{line.selected ? "[x]" : "[ ]"}</Text>}
    <View style={q.item}><Text style={q.itemName}>{line.name}</Text>{line.description ? <Text style={q.description}>{line.description}</Text> : null}</View>
    <Text style={q.price}>{formatCurrency(line.quantity * line.unitPrice)}</Text>
  </View>)}</View>;
}

export function QuotationDocument({ quote, settings, logoBuffer }: { quote: QuotationPdf; settings: Settings; logoBuffer?: Buffer }) {
  const required = quote.lineItems.filter((line) => line.kind === "REQUIRED");
  const optional = quote.lineItems.filter((line) => line.kind === "OPTIONAL");
  const totals = quotationTotals(quote.lineItems, quote.discountAmount, quote.vatRatePercent, quote.pricesIncludeVat);
  const selectedOptional = optional.filter((line) => line.selected).reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return <Document title={`${quote.quoteNumber} – Cenová ponuka obhliadky`} author={settings.companyName || "MALTAMAN"}>
    <Page size="A4" style={q.page}>
      <View style={q.header}>
        <View>{logoBuffer ? <Image src={logoBuffer} style={q.logo} /> : <Text style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 18 }}>MALTAMAN</Text>}<Text style={q.subtitle}>{settings.companyTagline || "NEZÁVISLÉ STAVEBNÉ PORADENSTVO"}</Text></View>
        <View style={{ alignItems: "flex-end" }}><Text style={q.title}>Cenová ponuka</Text><Text style={q.subtitle}>OBHLIADKA NEHNUTEĽNOSTI · {quote.quoteNumber}</Text></View>
      </View>
      <View style={q.grid}>
        <View style={q.card}><Text style={q.label}>Objednávateľ</Text><Text style={q.value}>{quote.clientName || "Neuvedené"}</Text><Text style={q.label}>Kontakt</Text><Text style={q.value}>{[quote.clientEmail, quote.clientPhone].filter(Boolean).join(" · ") || "Neuvedené"}</Text><Text style={q.label}>Nehnuteľnosť</Text><Text style={q.value}>{quote.propertyAddress || "Neuvedené"}</Text></View>
        <View style={q.card}><Text style={q.label}>Typ a rozsah</Text><Text style={q.value}>{PROPERTY_LABELS[quote.propertyType] ?? quote.propertyType} · {formatNumber(quote.floorAreaM2)} m² · {quote.floors} podlaží</Text><Text style={q.label}>Vystavená</Text><Text style={q.value}>{formatDate(quote.issuedAt)}</Text><Text style={q.label}>Platná do</Text><Text style={q.value}>{formatDate(quote.validUntil)}</Text></View>
      </View>
      <Text style={q.sectionTitle}>Povinná časť</Text>
      <LineRows lines={required} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 7, fontWeight: 700 }}><Text>Cena základnej obhliadky a cestovného</Text><Text>{formatCurrency(required.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))}</Text></View>
      <Text style={q.sectionTitle}>Voliteľné služby</Text>
      <Text style={{ fontSize: 8, color: colors.muted, marginBottom: 5 }}>Vybrané služby sú označené [x]. Nevybrané služby sú informatívne a nie sú zahrnuté v celkovej cene.</Text>
      <LineRows lines={optional} optional />
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 7, fontWeight: 700 }}><Text>Vybrané voliteľné služby</Text><Text>{formatCurrency(selectedOptional)}</Text></View>
      <View style={q.totalBox} wrap={false}>
        {quote.discountAmount > 0 && <View style={q.totalRow}><Text>Zľava</Text><Text>− {formatCurrency(quote.discountAmount)}</Text></View>}
        <View style={q.totalRow}><Text>Bez DPH</Text><Text>{formatCurrency(totals.priceExclVat)}</Text></View>
        <View style={q.totalRow}><Text>DPH {formatNumber(quote.vatRatePercent)} %</Text><Text>{formatCurrency(totals.vatAmount)}</Text></View>
        <View style={q.grandTotal}><Text>Celkom</Text><Text>{formatCurrency(totals.priceInclVat)}</Text></View>
      </View>
      <View style={q.note} wrap={false}><Text style={{ fontWeight: 700, marginBottom: 4 }}>Cestovné a rozsah</Text><Text>Východiskový bod: {quote.routeOrigin}. Vzdialenosť: {formatNumber(quote.oneWayDistanceKm, 1)} km jedným smerom, {formatNumber(quote.returnDistanceKm, 1)} km tam aj späť{quote.distanceManual ? " (ručne zadané)" : ""}.</Text>{quote.complexityDescription ? <Text style={{ marginTop: 4 }}>Náročnosť: {quote.complexityDescription}</Text> : null}</View>
      {quote.notes ? <View style={q.note} wrap={false}><Text style={{ fontWeight: 700, marginBottom: 4 }}>Poznámka</Text><Text>{quote.notes}</Text></View> : null}
      <View style={q.note} wrap={false}><Text style={{ fontWeight: 700, marginBottom: 4 }}>Podmienky ponuky</Text><Text>{quote.terms}</Text><Text style={{ marginTop: 4 }}>Kompletný protokol a ostatné voliteľné služby sa dodajú len vtedy, ak sú v tejto ponuke označené ako vybrané.</Text></View>
      <View style={q.signature}><Text style={q.signatureLine}>Za poskytovateľa</Text><Text style={q.signatureLine}>Súhlas klienta, dátum a podpis</Text></View>
      <PdfFooter quote={quote} company={settings.companyName || "MALTAMAN"} />
    </Page>
  </Document>;
}
