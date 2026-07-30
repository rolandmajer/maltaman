import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { styles, colors, statusColor } from "@/lib/pdf/styles";
import { computeRoomArea, computeCostItem, type CostTotals } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import {
  FINDING_STATUS_LABELS,
  FINDING_SEVERITY_LABELS,
  OVERALL_CONDITION_LABELS,
  OVERALL_VERDICT_LABELS,
  PRIORITY_LABELS,
  COST_UNIT_LABELS,
  RECOMMENDATION_CATEGORY_LABELS,
  SIGNATURE_ROLE_LABELS,
  ELEMENT_STATUS_LABELS,
  ELEMENT_STATUS_SHORT,
  CONDITION_DEADLINE_LABELS,
  ROOM_ELEMENT_ADDITIONAL_CONFIG,
  AMENITY_CATEGORIES,
  AMENITY_ATTRIBUTION,
} from "@/lib/constants";
import { parseJsonStringArray, formatAttributeValue } from "@/lib/element-description";
import type { FullInspection, FullFinding } from "@/types/inspection";
import type { AppSettings } from "@/generated/prisma/client";
import type { Annotation } from "@/components/wizard/photo-annotator";

type Props = {
  inspection: FullInspection;
  settings: AppSettings | null;
  totals: CostTotals;
  photoBuffers: Map<string, Buffer>;
  logoBuffer?: Buffer;
};

function HeaderFooter({ inspection, settings }: { inspection: FullInspection; settings: AppSettings | null }) {
  const companyLabel = [settings?.companyName, settings?.companyTagline].filter(Boolean).join(" – ") || "MALTAMAN";
  return (
    <>
      <View style={styles.header} fixed>
        <Text>{inspection.protocolNumber}</Text>
        <Text>{companyLabel}</Text>
      </View>
      <View style={styles.footer} fixed>
        <Text>Dátum reportu: {formatDate(new Date())}</Text>
        <Text render={({ pageNumber, totalPages }) => `Strana ${pageNumber} / ${totalPages}`} />
      </View>
    </>
  );
}

function KeyValueTable({ rows }: { rows: [string, string][] }) {
  return (
    <View style={styles.table}>
      {rows.map(([label, value], i) => (
        <View key={label} style={i === rows.length - 1 ? styles.tableRowLast : styles.kvRow} wrap={false}>
          <Text style={styles.labelCell}>{label}</Text>
          <Text style={styles.valueCell}>{value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  const label = ELEMENT_STATUS_SHORT[status] ?? status;
  return (
    <Text style={[styles.badge, { color, borderColor: color }]}>{label}</Text>
  );
}

/** Technický stav cell text: the picked defect types first, then the free-text note. */
function findingDetail(finding: FullFinding | undefined): string {
  if (!finding) return "";
  const types = parseJsonStringArray(finding.defectTypes).join(", ");
  return [types, finding.description].filter(Boolean).join(" — ");
}

function attributeLabel(elementKey: string, attributeKey: string): string {
  return ROOM_ELEMENT_ADDITIONAL_CONFIG[elementKey]?.attributes.find((a) => a.key === attributeKey)?.label ?? attributeKey;
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function CoverPage({ inspection, settings, logoBuffer }: Props) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View>
        {logoBuffer ? (
          <Image src={logoBuffer} style={{ width: 160, objectFit: "contain" }} />
        ) : (
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.brand }}>
            {settings?.companyName ?? "MALTAMAN"}
          </Text>
        )}
        <Text style={{ fontSize: 9, color: colors.muted, marginTop: 6 }}>
          {settings?.companyTagline ?? "Nezávislé stavebné poradenstvo"}
        </Text>
      </View>

      <View style={{ marginTop: 160 }}>
        <Text style={styles.coverTitle}>PROTOKOL Z OBHLIADKY NEHNUTEĽNOSTI</Text>
        <Text style={styles.coverSubtitle}>Číslo protokolu: {inspection.protocolNumber}</Text>
        {inspection.revisionNumber > 1 && (
          <Text style={styles.coverSubtitle}>Revízia č. {inspection.revisionNumber}</Text>
        )}
        <Text style={styles.coverSubtitle}>Dátum obhliadky: {formatDate(inspection.inspectionDate)}</Text>
        <Text style={styles.coverSubtitle}>
          Nehnuteľnosť: {inspection.property?.address || "—"}
          {inspection.property?.municipality ? `, ${inspection.property.municipality}` : ""}
        </Text>
        <Text style={styles.coverSubtitle}>Objednávateľ: {inspection.property?.ownerName || "—"}</Text>
      </View>

      <View style={{ marginTop: "auto" }}>
        <Text style={{ fontSize: 8, color: colors.muted }}>
          {settings?.companyAddress} {settings?.companyIco ? `· IČO: ${settings.companyIco}` : ""}
        </Text>
        <Text style={{ fontSize: 8, color: colors.muted }}>
          {settings?.companyPhone} {settings?.companyEmail ? `· ${settings.companyEmail}` : ""}{" "}
          {settings?.companyWeb ? `· ${settings.companyWeb}` : ""}
        </Text>
        <Text style={{ fontSize: 7.5, color: colors.faint, marginTop: 8 }}>
          Report vygenerovaný {formatDateTime(new Date())}
        </Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Identification + property + participants + conditions + legend
// ---------------------------------------------------------------------------

function IdentificationPage({ inspection, settings }: Props) {
  const p = inspection.property;
  const c = inspection.conditions;
  return (
    <Page size="A4" style={styles.page}>
      <HeaderFooter inspection={inspection} settings={settings} />

      <Text style={styles.sectionTitle}>1. Identifikácia protokolu</Text>
      <KeyValueTable
        rows={[
          ["Číslo protokolu", inspection.protocolNumber],
          ["Dátum obhliadky", formatDate(inspection.inspectionDate)],
          ["Čas", `${inspection.startTime ?? "—"} – ${inspection.endTime ?? "—"}`],
          ["Typ nehnuteľnosti", inspection.propertyType ?? "—"],
          ["Účel obhliadky", inspection.purpose ?? "—"],
          ["Všeobecná poznámka", inspection.generalNote || "—"],
        ]}
      />

      <Text style={styles.sectionTitle}>2. Informácie o nehnuteľnosti</Text>
      <KeyValueTable
        rows={[
          ["Adresa", `${p?.address ?? "—"}${p?.apartmentNumber ? `, byt č. ${p.apartmentNumber}` : ""}`],
          ["Poschodie", p?.floor ?? "—"],
          ["Obec", p?.municipality ?? "—"],
          ["PSČ", p?.postalCode ?? "—"],
          ["Okres", p?.district ?? "—"],
          ["Katastrálne územie", p?.cadastralArea ?? "—"],
          ["Parcelné číslo", p?.parcelNumber ?? "—"],
          ["List vlastníctva", p?.landRegistryNumber ?? "—"],
          ["Rok výstavby", p?.constructionYear ? String(p.constructionYear) : "—"],
          ["Rok poslednej rekonštrukcie", p?.lastRenovationYear ? String(p.lastRenovationYear) : "—"],
          ["Celková podlahová plocha", p?.totalFloorAreaM2 ? `${formatNumber(p.totalFloorAreaM2)} m²` : "—"],
          ["Stav obývanosti", p?.occupancyStatus ?? "—"],
          ["Správca / spoločenstvo", p?.administratorName ?? "—"],
          ["Vlastník / objednávateľ", p?.ownerName ?? "—"],
          ["Kontaktné údaje", p?.ownerContact ?? "—"],
        ]}
      />

      <Text style={styles.sectionTitle}>3. Účastníci obhliadky</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { width: "28%" }]}>Meno</Text>
          <Text style={[styles.th, { width: "22%" }]}>Funkcia</Text>
          <Text style={[styles.th, { width: "20%" }]}>Kontakt</Text>
          <Text style={[styles.th, { width: "30%" }]}>Prítomný</Text>
        </View>
        {inspection.participants.length === 0 ? (
          <View style={styles.tableRowLast}>
            <Text style={[styles.td, { width: "100%" }]}>Žiadni účastníci neboli zaznamenaní.</Text>
          </View>
        ) : (
          inspection.participants.map((p, i) => (
            <View key={p.id} style={i === inspection.participants.length - 1 ? styles.tableRowLast : styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "28%" }]}>{p.fullName}</Text>
              <Text style={[styles.td, { width: "22%" }]}>{p.role || "—"}</Text>
              <Text style={[styles.td, { width: "20%" }]}>{p.phone || p.email || "—"}</Text>
              <Text style={[styles.td, { width: "30%" }]}>
                {p.presentFrom || p.presentTo ? `${p.presentFrom} – ${p.presentTo}` : "—"}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>4. Podmienky obhliadky</Text>
      <KeyValueTable
        rows={[
          ["Počasie", c?.weather ?? "—"],
          ["Vonkajšia teplota", c?.outdoorTemperatureC != null ? `${c.outdoorTemperatureC} °C` : "—"],
          ["Obsadenosť", c?.occupancy ?? "—"],
          ["Prístupnosť priestorov", c?.accessibility ?? "—"],
          ["Osvetlenie", c?.lighting ?? "—"],
          ["Stav zariadenia", c?.equipmentCondition ?? "—"],
          ["Obmedzenia obhliadky", c?.limitations ?? "—"],
          ["Použité meracie zariadenia", c?.measuringDevices ?? "—"],
          ["Poznámky", c?.notes ?? "—"],
        ]}
      />

      <Text style={styles.sectionTitle}>5. Legenda hodnotenia</Text>
      {(["OK", "V", "R", "N"] as const).map((s) => (
        <View key={s} style={styles.legendRow}>
          <StatusBadge status={s} />
          <Text style={styles.paragraph}>{FINDING_STATUS_LABELS[s]}</Text>
        </View>
      ))}
      <View style={styles.legendRow}>
        <StatusBadge status="NEVZTAHUJE_SA" />
        <Text style={styles.paragraph}>{ELEMENT_STATUS_LABELS.NEVZTAHUJE_SA}</Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

function roomElementCounts(room: FullInspection["rooms"][number]) {
  const assessed = room.elements.filter((e) => e.status !== "NEVZTAHUJE_SA");
  return {
    ok: assessed.filter((e) => e.status === "OK").length,
    defects: assessed.filter((e) => e.status === "V").length,
    risks: assessed.filter((e) => e.status === "R").length,
    notAssessed: assessed.filter((e) => e.status === "N").length,
  };
}

function ConditionBlock({ condition, inspection, photoBuffers }: {
  condition: FullInspection["rooms"][number]["elements"][number]["conditions"][number];
  inspection: FullInspection;
  photoBuffers: Map<string, Buffer>;
}) {
  const defectTypes = parseJsonStringArray(condition.defectTypes);
  const rows: [string, string][] = [];
  if (defectTypes.length > 0) rows.push(["Typ", defectTypes.join(", ")]);
  if (condition.location) rows.push(["Umiestnenie", condition.location]);
  if (condition.extent) rows.push(["Rozsah", condition.extent]);
  if (condition.cause) rows.push(["Predpokladaná príčina", condition.cause]);
  if (condition.recommendedAction) rows.push(["Odporúčané opatrenie", condition.recommendedAction]);
  if (condition.deadline) rows.push(["Termín zásahu", CONDITION_DEADLINE_LABELS[condition.deadline]]);
  if (condition.note) rows.push(["Poznámka", condition.note]);
  if (condition.measurements.length > 0) {
    rows.push(["Merania", condition.measurements.map((m) => `${m.label}: ${formatNumber(m.value)} ${m.unit}`).join(", ")]);
  }
  const cost = inspection.costItems.filter((c) => c.elementConditionId === condition.id && c.included);
  const costSum = cost.reduce((s, c) => s + computeCostItem(c, inspection.costsEnteredInclVat).priceInclVat, 0);
  if (costSum > 0) rows.push(["Odhad nákladov", formatCurrency(costSum)]);

  const photos = condition.photos.filter((p) => !p.excludeFromReport);

  if (rows.length === 0 && photos.length === 0) return null;

  return (
    <View style={{ marginBottom: 6, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: colors.border }} wrap={false}>
      {condition.severity && (
        <Text style={[styles.paragraph, { fontWeight: "bold" }]}>{FINDING_SEVERITY_LABELS[condition.severity]}</Text>
      )}
      {rows.map(([label, value]) => (
        <Text key={label} style={[styles.paragraph, styles.muted]}>
          {label}: {value}
        </Text>
      ))}
      {photos.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {photos.map((photo) => {
            const buffer = photoBuffers.get(photo.id);
            return buffer ? (
              <Image key={photo.id} src={buffer} style={{ width: 48, height: 48, objectFit: "cover" }} />
            ) : null;
          })}
        </View>
      )}
    </View>
  );
}

function RoomsSection({ inspection, settings, photoBuffers }: Props) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>6. Obhliadka po miestnostiach</Text>
      {inspection.rooms.length === 0 && <Text style={styles.paragraph}>Neboli zaznamenané žiadne miestnosti.</Text>}
      {inspection.rooms
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((room) => {
          const area = computeRoomArea(room.lengthM, room.widthM, room.areaOverrideM2);
          const counts = roomElementCounts(room);
          return (
            <View key={room.id} style={{ marginBottom: 12 }}>
              <Text style={styles.subTitle}>
                {room.name} ({room.type}){area ? ` — ${formatNumber(area)} m²` : ""}
              </Text>
              {(room.generalCondition || room.accessibility || room.notes) && (
                <Text style={[styles.paragraph, styles.muted]}>
                  {[room.generalCondition, room.accessibility, room.notes].filter(Boolean).join(" · ")}
                </Text>
              )}
              <Text style={[styles.paragraph, styles.muted]}>
                {counts.ok} prvkov OK · {counts.defects} vád · {counts.risks} rizík · {counts.notAssessed} neposudzovaných
              </Text>

              {room.elements
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((element) => {
                  if (element.status === "NEVZTAHUJE_SA") {
                    return (
                      <View key={element.id} style={{ flexDirection: "row", gap: 6, marginBottom: 2 }} wrap={false}>
                        <Text style={[styles.td, { width: "22%" }]}>{element.label}</Text>
                        <Text style={[styles.td, styles.muted, { width: "78%" }]}>— nevzťahuje sa —</Text>
                      </View>
                    );
                  }
                  // formatAttributeValue, not a.value: an emptied multi-select stores "[]", which
                  // is truthy but must not render as an attribute row.
                  const setAttributes = element.attributes.filter((a) => formatAttributeValue(a.value));
                  const conditions = element.conditions.slice().sort((a, b) => a.order - b.order);
                  return (
                    <View key={element.id} style={{ marginBottom: 8 }} wrap={false}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.td, { width: "60%", fontWeight: "bold" }]}>{element.label}</Text>
                        <StatusBadge status={element.status} />
                      </View>
                      {element.status === "N" && element.naReason && (
                        <Text style={[styles.paragraph, styles.muted]}>Dôvod: {ELEMENT_STATUS_LABELS.N}</Text>
                      )}
                      {setAttributes.length > 0 && (
                        <Text style={[styles.paragraph, styles.muted]}>
                          {setAttributes
                            .map((a) => `${attributeLabel(element.elementKey, a.attributeKey)}: ${formatAttributeValue(a.value)}`)
                            .join(" · ")}
                        </Text>
                      )}
                      {element.description && <Text style={styles.paragraph}>{element.description}</Text>}
                      {conditions.map((condition) => (
                        <ConditionBlock key={condition.id} condition={condition} inspection={inspection} photoBuffers={photoBuffers} />
                      ))}
                    </View>
                  );
                })}
            </View>
          );
        })}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Technical condition
// ---------------------------------------------------------------------------

function TechnicalSection({ inspection, settings }: Props) {
  return (
    <Page size="A4" style={styles.page}>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>7. Technický stav spoločných a stavebných prvkov</Text>
      {inspection.categories.length === 0 && <Text style={styles.paragraph}>Bez záznamov.</Text>}
      {inspection.categories
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((category) => (
          <View key={category.id} wrap={false} style={{ marginBottom: 10 }}>
            <Text style={styles.subTitle}>{category.name}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: "22%" }]}>Prvok</Text>
                <Text style={[styles.th, { width: "10%" }]}>Hodn.</Text>
                <Text style={[styles.th, { width: "48%" }]}>Zistenie / poznámka</Text>
                <Text style={[styles.th, { width: "20%" }]}>Odporúčaný špecialista</Text>
              </View>
              {category.elements
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((el, i, arr) => {
                  const f = el.findings[0];
                  return (
                    <View key={el.id} style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow} wrap={false}>
                      <Text style={[styles.td, { width: "22%" }]}>{el.name}</Text>
                      <View style={{ width: "10%", padding: 4 }}>
                        <StatusBadge status={f?.status ?? "N"} />
                      </View>
                      <Text style={[styles.td, { width: "48%" }]}>{findingDetail(f) || "—"}</Text>
                      <Text style={[styles.td, { width: "20%" }]}>{f?.recommendedSpecialist || "—"}</Text>
                    </View>
                  );
                })}
            </View>
          </View>
        ))}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Findings summary
// ---------------------------------------------------------------------------

type SummaryDefectRow = {
  id: string;
  status: string;
  severity: string | null;
  label: string;
  description: string;
  source: string;
};

function FindingsSummaryPage({ inspection, settings }: Props) {
  const legacyDefects: SummaryDefectRow[] = inspection.findings
    .filter((f) => (f.status === "V" || f.status === "R") && f.includeInSummary)
    .map((f) => ({
      id: f.id,
      status: f.status,
      severity: f.severity,
      label: f.label,
      description: f.description,
      source: "Technický stav",
    }));

  const roomNameById = new Map(inspection.rooms.map((r) => [r.id, r.name]));
  const roomDefects: SummaryDefectRow[] = inspection.rooms.flatMap((room) =>
    room.elements
      .filter((element) => element.status === "V" || element.status === "R")
      .flatMap((element) =>
        element.conditions
          .filter((c) => c.includeInSummary)
          .map((c) => ({
            id: c.id,
            status: element.status,
            severity: c.severity,
            label: element.label,
            description: [c.location, c.note].filter(Boolean).join(" — ") || parseJsonStringArray(c.defectTypes).join(", "),
            source: roomNameById.get(room.id) ?? "Miestnosť",
          }))
      )
  );

  const defects = [...legacyDefects, ...roomDefects];
  const positives = inspection.findings.filter((f) => f.isPositiveObservation);

  return (
    <Page size="A4" style={styles.page}>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>8. Zhrnutie zistení</Text>

      <KeyValueTable
        rows={[
          [
            "Celkový stav nehnuteľnosti",
            inspection.overallConditionRating ? OVERALL_CONDITION_LABELS[inspection.overallConditionRating] : "—",
          ],
          ["Hlavné riziká", inspection.mainRisks || "—"],
          ["Okamžité opatrenia", inspection.immediateActions || "—"],
          ["Odporúčané ďalšie obhliadky", inspection.followUpInspections || "—"],
        ]}
      />

      <Text style={styles.subTitle}>Zistené vady a riziká</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { width: "8%" }]}>Hodn.</Text>
          <Text style={[styles.th, { width: "14%" }]}>Závažnosť</Text>
          <Text style={[styles.th, { width: "18%" }]}>Prvok</Text>
          <Text style={[styles.th, { width: "42%" }]}>Popis</Text>
          <Text style={[styles.th, { width: "18%" }]}>Zdroj</Text>
        </View>
        {defects.length === 0 ? (
          <View style={styles.tableRowLast}>
            <Text style={[styles.td, { width: "100%" }]}>Neboli zistené žiadne vady ani riziká.</Text>
          </View>
        ) : (
          defects.map((f, i) => (
            <View key={f.id} style={i === defects.length - 1 ? styles.tableRowLast : styles.tableRow} wrap={false}>
              <View style={{ width: "8%", padding: 4 }}>
                <StatusBadge status={f.status} />
              </View>
              <Text style={[styles.td, { width: "14%" }]}>{f.severity ? FINDING_SEVERITY_LABELS[f.severity] : "—"}</Text>
              <Text style={[styles.td, { width: "18%" }]}>{f.label}</Text>
              <Text style={[styles.td, { width: "42%" }]}>{f.description || "—"}</Text>
              <Text style={[styles.td, styles.muted, { width: "18%" }]}>{f.source}</Text>
            </View>
          ))
        )}
      </View>

      {positives.length > 0 && (
        <>
          <Text style={styles.subTitle}>Pozitívne zistenia</Text>
          {positives.map((p) => (
            <Text key={p.id} style={styles.paragraph}>
              • {p.description || p.label}
            </Text>
          ))}
        </>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Cost estimate
// ---------------------------------------------------------------------------

function CostEstimatePage({ inspection, totals, settings }: Props) {
  const categories = inspection.costCategories.slice().sort((a, b) => a.order - b.order);
  return (
    <Page size="A4" style={styles.page}>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>9. Odhad nákladov na odstránenie vád</Text>
      <Text style={[styles.paragraph, styles.muted]}>
        Odhady sú orientačné, v cenovej úrovni ku dňu obhliadky ({formatDate(inspection.inspectionDate)}).{" "}
        {inspection.costsIncludeVat ? "Uvedené ceny sú vrátane DPH." : "Uvedené ceny sú bez DPH, pokiaľ nie je uvedené inak."}
        {inspection.costsEnteredInclVat && " Ceny boli zadané ako konečné sumy s DPH; základ dane a DPH sú z nich dopočítané."}
      </Text>

      {categories.map((category) => {
        const items = inspection.costItems.filter((i) => i.categoryId === category.id && i.included);
        if (items.length === 0) return null;
        return (
          <View key={category.id} style={{ marginBottom: 8 }} wrap={false}>
            <Text style={styles.subTitle}>{category.name}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: "34%" }]}>Položka</Text>
                <Text style={[styles.th, { width: "12%" }]}>Množstvo</Text>
                <Text style={[styles.th, { width: "18%" }]}>Priorita</Text>
                <Text style={[styles.th, { width: "18%" }]}>Cena bez DPH</Text>
                <Text style={[styles.th, { width: "18%" }]}>Cena s DPH</Text>
              </View>
              {items.map((item, i) => {
                const computed = computeCostItem(item, inspection.costsEnteredInclVat);
                return (
                  <View key={item.id} style={i === items.length - 1 ? styles.tableRowLast : styles.tableRow} wrap={false}>
                    <Text style={[styles.td, { width: "34%" }]}>{item.name}</Text>
                    <Text style={[styles.td, { width: "12%" }]}>
                      {formatNumber(item.quantity)} {COST_UNIT_LABELS[item.unit]}
                    </Text>
                    <Text style={[styles.td, { width: "18%" }]}>{PRIORITY_LABELS[item.priority]}</Text>
                    <Text style={[styles.td, { width: "18%" }]}>{formatCurrency(computed.priceExclVat)}</Text>
                    <Text style={[styles.td, { width: "18%" }]}>{formatCurrency(computed.priceInclVat)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      <Text style={styles.subTitle}>Súhrn</Text>
      <KeyValueTable
        rows={[
          ["Spolu bez DPH", formatCurrency(totals.totalExclVat)],
          ["DPH", formatCurrency(totals.totalVat)],
          ["Spolu s DPH", formatCurrency(totals.totalInclVat)],
          ["Rezerva na nepredvídané práce", `${formatNumber(inspection.contingencyPercent)} % (${formatCurrency(totals.contingencyAmount)})`],
          ["Celková suma vrátane rezervy", formatCurrency(totals.finalTotalWithContingency)],
          ["Minimálny scenár", formatCurrency(totals.totalMin)],
          ["Očakávaný scenár", formatCurrency(totals.totalExpected)],
          ["Maximálny scenár", formatCurrency(totals.totalMax)],
        ]}
      />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function RecommendationsPage({ inspection, settings }: Props) {
  const categories = Object.keys(RECOMMENDATION_CATEGORY_LABELS);
  return (
    <Page size="A4" style={styles.page}>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>10. Odporúčania</Text>

      {inspection.overallVerdict && (
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.subTitle}>Odporúčanie poradcu</Text>
          <Text style={styles.paragraph}>{OVERALL_VERDICT_LABELS[inspection.overallVerdict]}</Text>
          {inspection.recommendedDiscountAmount != null && (
            <Text style={styles.paragraph}>Odporúčaná výška zľavy: {formatCurrency(inspection.recommendedDiscountAmount)}</Text>
          )}
          {inspection.verdictJustification && <Text style={styles.paragraph}>{inspection.verdictJustification}</Text>}
        </View>
      )}

      {categories.map((category) => {
        const items = inspection.recommendations.filter((r) => r.category === category).sort((a, b) => a.order - b.order);
        if (items.length === 0) return null;
        return (
          <View key={category} style={{ marginBottom: 6 }} wrap={false}>
            <Text style={styles.subTitle}>{RECOMMENDATION_CATEGORY_LABELS[category]}</Text>
            {items.map((r) => (
              <Text key={r.id} style={styles.paragraph}>
                • {r.text}
              </Text>
            ))}
          </View>
        );
      })}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Photo documentation
// ---------------------------------------------------------------------------

function parseAnnotations(json: string): Annotation[] {
  try {
    return JSON.parse(json) as Annotation[];
  } catch {
    return [];
  }
}

function PhotoDocumentationPages({ inspection, photoBuffers, settings }: Props) {
  const photos = inspection.photos.filter((p) => !p.excludeFromReport).sort((a, b) => a.order - b.order);
  const roomNameById = new Map(inspection.rooms.map((r) => [r.id, r.name]));
  const findingLabelById = new Map(inspection.findings.map((f) => [f.id, f.label]));

  if (photos.length === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <HeaderFooter inspection={inspection} settings={settings} />
        <Text style={styles.sectionTitle}>11. Fotodokumentácia</Text>
        <Text style={styles.paragraph}>K protokolu nebola priložená fotodokumentácia.</Text>
      </Page>
    );
  }

  return (
    <Page size="A4" style={styles.page} wrap>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>11. Fotodokumentácia</Text>
      <Text style={[styles.paragraph, styles.muted]}>Príloha č. 1 — počet záberov: {photos.length}</Text>
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => {
          const buffer = photoBuffers.get(photo.id);
          const annotations = parseAnnotations(photo.annotationsJson);
          const location = photo.roomId
            ? roomNameById.get(photo.roomId)
            : photo.findingId
              ? findingLabelById.get(photo.findingId)
              : null;
          return (
            <View key={photo.id} style={styles.photoCard} wrap={false}>
              {buffer ? (
                <View style={{ position: "relative" }}>
                  <Image
                    src={buffer}
                    style={[
                      styles.photoImage,
                      photo.rotationDegrees ? { transform: `rotate(${photo.rotationDegrees}deg)` } : {},
                    ]}
                  />
                  {annotations.length > 0 && (
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                      {annotations.map((a) => (
                        <Text
                          key={a.id}
                          style={{
                            position: "absolute",
                            left: `${a.type === "circle" ? a.x : a.x}%`,
                            top: `${a.type === "circle" ? a.y : a.y}%`,
                            fontSize: 6,
                            backgroundColor: colors.r,
                            color: "white",
                            paddingHorizontal: 2,
                          }}
                        >
                          {a.label}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.photoImage, { backgroundColor: colors.headerBg }]} />
              )}
              <Text style={styles.photoCaption}>
                {index + 1}. {location ? `${location} — ` : ""}
                {photo.caption || "bez popisu"}
                {photo.capturedAt ? ` (${formatDate(photo.capturedAt)})` : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Declarations & signatures
// ---------------------------------------------------------------------------

function DeclarationsPage({ inspection, settings }: Props) {
  const technician = inspection.signatures.find((s) => s.role === "TECHNICIAN");
  const client = inspection.signatures.find((s) => s.role === "CLIENT");
  const technician2 = inspection.signatures.find((s) => s.role === "TECHNICIAN2");

  const legalItems = [
    settings?.legalVisualNonDestructive,
    settings?.legalNotAReplacement,
    settings?.legalHiddenDefects,
    settings?.legalLimitedByAccess,
    settings?.legalCostsIndicative,
    settings?.legalClientOnly,
  ].filter(Boolean) as string[];

  return (
    <Page size="A4" style={styles.page}>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>12. Vyhlásenie, obmedzenia a podpisy</Text>
      {legalItems.map((text, i) => (
        <Text key={i} style={styles.paragraph}>
          – {text}
        </Text>
      ))}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 20 }}>
        {[technician, technician2, client].filter(Boolean).map((s) => (
          <View key={s!.id} style={styles.signatureBlock}>
            {s!.imageDataUrl && <Image src={s!.imageDataUrl} style={{ width: 140, height: 50, marginBottom: 4 }} />}
            <Text style={styles.paragraph}>{SIGNATURE_ROLE_LABELS[s!.role]}</Text>
            <Text style={[styles.paragraph, styles.muted]}>{s!.fullName || "—"}</Text>
            {s!.registrationNumber ? <Text style={[styles.paragraph, styles.muted]}>Č.: {s!.registrationNumber}</Text> : null}
            <Text style={[styles.paragraph, styles.muted]}>
              {s!.place || "—"} {s!.signedAt ? `· ${formatDate(s!.signedAt)}` : ""}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Občianska vybavenosť (paid add-on)
// ---------------------------------------------------------------------------

/**
 * Appended last and numbered 13 deliberately: the section is optional, so placing it earlier would
 * leave a gap in the hard-coded section numbering of every report that doesn't include it.
 */
function AmenitiesPage({ inspection, settings }: Props) {
  if (!inspection.amenitiesEnabled) return null;

  const included = inspection.amenityPlaces.filter((p) => p.includeInReport && p.name.trim());
  if (included.length === 0) return null;

  const byCategory = AMENITY_CATEGORIES.map((category) => ({
    label: category.label,
    places: included
      .filter((p) => p.category === category.key)
      .sort((a, b) => a.distanceM - b.distanceM),
  })).filter((group) => group.places.length > 0);

  const formatDistance = (metres: number) =>
    metres >= 1000 ? `${(metres / 1000).toFixed(1).replace(".", ",")} km` : `${metres} m`;

  const formatTimes = (walk: number | null, drive: number | null) =>
    [walk != null ? `pešo ${walk} min` : null, drive != null ? `autom ${drive} min` : null]
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    <Page size="A4" style={styles.page}>
      <HeaderFooter inspection={inspection} settings={settings} />
      <Text style={styles.sectionTitle}>13. Občianska vybavenosť v okolí</Text>
      <Text style={[styles.paragraph, styles.muted]}>
        Prehľad služieb a zariadení v okolí nehnuteľnosti. Vzdialenosti sú uvedené vzdušnou líniou,
        časy sú orientačným odhadom vrátane prirážky na skutočnú trasu.
      </Text>

      {byCategory.map((group) => (
        <View key={group.label} style={{ marginTop: 10 }} wrap={false}>
          <Text style={styles.subTitle}>{group.label}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { width: "52%" }]}>Miesto</Text>
              <Text style={[styles.th, { width: "16%" }]}>Vzdialenosť</Text>
              <Text style={[styles.th, { width: "32%" }]}>Čas</Text>
            </View>
            {group.places.map((place, i, arr) => (
              <View
                key={place.id}
                style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow}
                wrap={false}
              >
                <Text style={[styles.td, { width: "52%" }]}>
                  {place.name}
                  {place.note ? ` — ${place.note}` : ""}
                </Text>
                <Text style={[styles.td, { width: "16%" }]}>{formatDistance(place.distanceM)}</Text>
                <Text style={[styles.td, { width: "32%" }]}>
                  {formatTimes(place.walkMinutes, place.driveMinutes)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={[styles.paragraph, styles.muted, { marginTop: 14 }]}>{AMENITY_ATTRIBUTION}</Text>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

export function InspectionDocument(props: Props) {
  return (
    <Document title={`${props.inspection.protocolNumber} — Protokol z obhliadky nehnuteľnosti`} language="sk">
      <CoverPage {...props} />
      <IdentificationPage {...props} />
      <RoomsSection {...props} />
      <TechnicalSection {...props} />
      <FindingsSummaryPage {...props} />
      <CostEstimatePage {...props} />
      <RecommendationsPage {...props} />
      <PhotoDocumentationPages {...props} />
      <DeclarationsPage {...props} />
      <AmenitiesPage {...props} />
    </Document>
  );
}
