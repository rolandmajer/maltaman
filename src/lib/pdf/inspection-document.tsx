import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { styles, colors, statusChip } from "@/lib/pdf/styles";
import { computeRoomArea, computeCostItem, type CostTotals } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import {
  FINDING_SEVERITY_LABELS,
  OVERALL_CONDITION_LABELS,
  OVERALL_VERDICT_LABELS,
  RECOMMENDATION_CATEGORY_LABELS,
  SIGNATURE_ROLE_LABELS,
  ELEMENT_STATUS_SHORT,
  CONDITION_DEADLINE_LABELS,
  COST_UNIT_LABELS,
  ELEMENT_NA_REASON_LABELS,
  AMENITY_CATEGORIES,
  AMENITY_ATTRIBUTION,
} from "@/lib/constants";
import { parseJsonStringArray, formatAttributeValue } from "@/lib/element-description";
import {
  roomTally,
  overallTally,
  assessedCount,
  collectDefects,
  totalFloorArea,
  negotiationAmount,
  splitColumns,
  type StatusTally,
} from "@/lib/pdf/report-model";
import type { FullInspection } from "@/types/inspection";
import type { AppSettings } from "@/generated/prisma/client";
import type { Annotation } from "@/components/wizard/photo-annotator";

type Props = {
  inspection: FullInspection;
  settings: AppSettings | null;
  totals: CostTotals;
  photoBuffers: Map<string, Buffer>;
  logoBuffer?: Buffer;
  logoWhiteBuffer?: Buffer;
};

/** Section numbers are assigned from the sections that actually render, so an omitted optional
 *  section (photos, amenities) never leaves a gap in the numbering the reader sees. */
type SectionKey =
  | "suhrn"
  | "identifikacia"
  | "miestnosti"
  | "technicky"
  | "vady"
  | "naklady"
  | "odporucania"
  | "foto"
  | "vybavenost"
  | "priloha";

type Numbering = Record<SectionKey, string>;

const A4 = "A4" as const;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function Footer({ inspection, settings }: { inspection: FullInspection; settings: AppSettings | null }) {
  const company = settings?.companyName || "MALTAMAN";
  return (
    <View style={styles.footer} fixed>
      <Text>
        {inspection.protocolNumber}
        {inspection.revisionNumber > 1 ? ` · revízia ${inspection.revisionNumber}` : ""} · {company}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SectionHead({ number, title, aside }: { number: string; title: string; aside?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionNumber}>{number}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {aside ? <Text style={styles.sectionAside}>{aside}</Text> : null}
    </View>
  );
}

function Chip({ status, label }: { status: string; label?: string }) {
  const chip = statusChip(status);
  return <Text style={[styles.chip, chip]}>{label ?? ELEMENT_STATUS_SHORT[status] ?? status}</Text>;
}

function KeyValues({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([label, value], i) => (
        <View key={label} style={i === rows.length - 1 ? styles.kvRowLast : styles.kvRow}>
          <Text style={styles.kvLabel}>{label}</Text>
          <Text style={[styles.kvValue, value ? {} : { color: colors.faint, fontWeight: 400 }]}>{value || "neuvedené"}</Text>
        </View>
      ))}
    </View>
  );
}

/** Label above a big figure, as used across the summary tiles. */
function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={[styles.cardSurface, { flex: 1 }]} wrap={false}>
      <Text style={[styles.eyebrowMuted, { marginBottom: 6 }]}>{label}</Text>
      {children}
    </View>
  );
}

function Metric({ value, unit, color }: { value: string; unit?: string; color?: string }) {
  return (
    <Text style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 19, lineHeight: 1.15, color: color ?? colors.ink }}>
      {value}
      {unit ? <Text style={{ fontSize: 10, color: colors.muted, fontWeight: 700 }}> {unit}</Text> : null}
    </Text>
  );
}

function statusCountLine(tally: StatusTally, onDark = false) {
  const parts: { text: string; color: string }[] = [];
  if (tally.ok) parts.push({ text: `${tally.ok} OK`, color: onDark ? colors.onDarkOk : colors.okText });
  if (tally.v) parts.push({ text: `${tally.v} V`, color: onDark ? colors.onDarkV : colors.vText });
  if (tally.r) parts.push({ text: `${tally.r} R`, color: colors.rText });
  if (tally.n) parts.push({ text: `${tally.n} N`, color: onDark ? colors.onDarkMuted : colors.nText });
  return parts;
}

/**
 * The one-line "— laminát, plávajúca, pôvodná" trailer after an element name.
 *
 * Falls back to the generated description, which opens by restating the element it describes
 * ("Steny — tehlové murivo…", or for an untouched element just "Zásuvka."). Printed straight after
 * the label that produced it, that read as "Steny — Steny — tehlové murivo…" and "Zásuvky —
 * Zásuvka." down the whole appendix, so the restatement is dropped and only the new part kept.
 */
export function elementDetailFrom(label: string, description: string, attributeValues: string[]): string {
  const attrs = attributeValues.map((v) => formatAttributeValue(v)).filter(Boolean).join(", ");
  if (attrs) return attrs;

  const element = { label, description };
  // Consume the restatement word by word rather than just the first word — a multi-word label
  // ("Viditeľná pleseň") otherwise left the tail behind as "Viditeľná pleseň — pleseň."
  const labelWords = element.label.split(/[\s/]+/).filter(Boolean);
  const descWords = element.description.trim().split(/\s+/).filter(Boolean);

  let d = 0;
  for (const labelWord of labelWords) {
    const candidate = descWords[d]?.replace(/[.,;—–]+$/, "") ?? "";
    if (!candidate || !sharesStem(candidate, labelWord)) break;
    d++;
  }
  // Only treat it as a restatement if the whole label was matched; a partial match means the
  // description opens with something else and must be printed intact.
  const rest = (d === labelWords.length ? descWords.slice(d) : descWords).join(" ").replace(/^[—–,\-.\s]+/, "");
  return rest.replace(/[.\s]+$/, "") ? rest : "";
}

/** The one-line trailer after an element name in the room cards and the appendix. */
function elementDetail(element: FullInspection["rooms"][number]["elements"][number]): string {
  return elementDetailFrom(
    element.label,
    element.description,
    element.attributes.map((a) => a.value)
  );
}

/** True when two words share a long enough opening to be the same term in a different case. */
function sharesStem(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (!x || !y) return false;
  if (x === y) return true;
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  // Three shared characters with at most two differing at the end. The tight tail is what does the
  // work: it accepts Okná/Okno and Zásuvky/Zásuvka, and rejects Voda/Vodovodná, which shares an
  // opening but diverges far too much to be the same term.
  return i >= 3 && Math.min(x.length, y.length) >= 3 && x.length - i <= 2 && y.length - i <= 2;
}

/** Keeps a summary tile to a single readable phrase instead of letting it stretch the whole row. */
function clamp(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","));
  return `${cut.slice(0, lastBreak > max * 0.6 ? lastBreak : max).trim()}…`;
}

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

function CoverPage({ inspection, settings, logoWhiteBuffer }: Props) {
  const p = inspection.property;
  const area = totalFloorArea(inspection);
  const subtitleBits = [
    p?.postalCode || p?.municipality ? [p?.postalCode, p?.municipality].filter(Boolean).join(" ") : null,
    // Printed verbatim: the field already holds a phrase like "3. poschodie z 8", so appending
    // the word here produced "3. poschodie z 8. poschodie".
    p?.floor || null,
    inspection.propertyType,
    area ? `${formatNumber(area)} m²` : null,
  ].filter(Boolean);

  const facts: [string, string][] = [
    ["Číslo protokolu", inspection.protocolNumber],
    ["Dátum obhliadky", formatDate(inspection.inspectionDate)],
    ["Objednávateľ", p?.ownerName || "—"],
    ["Účel", inspection.purpose || "—"],
  ];

  return (
    <Page size={A4} style={styles.coverPage}>
      <View
        style={{
          margin: 28,
          flexGrow: 1,
          backgroundColor: colors.brand,
          borderRadius: 14,
          paddingVertical: 44,
          paddingHorizontal: 38,
          color: colors.white,
          // Clips the two rings below to the rounded panel — without it they hang off the corner
          // and over the white page margin.
          overflow: "hidden",
        }}
      >
        {/* Decorative rings bleeding off the top-right corner. Drawn first so everything else
            paints over them, and sized in points (borderRadius takes no percentage here, so each
            radius is simply half the box). */}
        <View
          style={{
            position: "absolute",
            top: -100.8,
            right: -100.8,
            width: 302.4,
            height: 302.4,
            borderRadius: 151.2,
            borderWidth: 1.5,
            borderColor: colors.coverRingOuter,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: -43.2,
            right: -43.2,
            width: 187.2,
            height: 187.2,
            borderRadius: 93.6,
            borderWidth: 1.5,
            borderColor: colors.coverRingInner,
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {logoWhiteBuffer ? (
            <Image src={logoWhiteBuffer} style={{ height: 21, objectFit: "contain" }} />
          ) : (
            <Text style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 17, color: colors.white }}>
              {settings?.companyName ?? "MALTAMAN"}
            </Text>
          )}
          <Text
            style={{
              fontFamily: "PlexMono",
              fontWeight: 600,
              fontSize: 6.6,
              letterSpacing: 1.1,
              color: colors.white,
              opacity: 0.82,
            }}
          >
            {(settings?.companyTagline ?? "Nezávislé stavebné poradenstvo").toUpperCase()}
          </Text>
        </View>

        <View style={{ flexGrow: 1, justifyContent: "center", paddingVertical: 26 }}>
          <Text
            style={{
              fontFamily: "PlexMono",
              fontWeight: 600,
              fontSize: 7.5,
              letterSpacing: 2,
              color: colors.white,
              opacity: 0.8,
              marginBottom: 18,
            }}
          >
            PROTOKOL Z OBHLIADKY
          </Text>
          <Text
            style={{
              fontFamily: "Archivo",
              fontWeight: 900,
              fontSize: 36,
              lineHeight: 1.02,
              color: colors.white,
            }}
          >
            Obhliadka{"\n"}nehnuteľnosti
          </Text>
          <View style={{ width: 52, height: 4, backgroundColor: colors.white, borderRadius: 2, marginVertical: 20 }} />
          <Text style={{ fontFamily: "Archivo", fontWeight: 700, fontSize: 14, color: colors.white, lineHeight: 1.2 }}>
            {[p?.address, p?.apartmentNumber ? `byt č. ${p.apartmentNumber}` : null].filter(Boolean).join(", ") ||
              "Adresa nezadaná"}
          </Text>
          {subtitleBits.length > 0 && (
            <Text style={{ fontSize: 9.5, color: colors.white, opacity: 0.86, marginTop: 4 }}>
              {subtitleBits.join(" · ")}
            </Text>
          )}
          {inspection.revisionNumber > 1 && (
            <Text style={{ fontSize: 9, color: colors.white, opacity: 0.8, marginTop: 6 }}>
              Revízia č. {inspection.revisionNumber}
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            borderWidth: 1,
            borderColor: colors.brandHairline,
            borderRadius: 9,
          }}
        >
          {facts.map(([label, value], i) => (
            <View
              key={label}
              style={{
                flex: 1,
                paddingVertical: 11,
                paddingHorizontal: 12,
                borderLeftWidth: i === 0 ? 0 : 1,
                borderLeftColor: colors.brandHairline,
              }}
            >
              <Text
                style={{
                  fontFamily: "PlexMono",
                  fontWeight: 600,
                  fontSize: 6,
                  letterSpacing: 0.9,
                  color: colors.white,
                  opacity: 0.72,
                  marginBottom: 5,
                }}
              >
                {label.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 9.5, fontWeight: 600, color: colors.white }}>{value}</Text>
            </View>
          ))}
        </View>

        <Text
          style={{
            fontFamily: "PlexMono",
            fontSize: 6.8,
            color: colors.white,
            opacity: 0.7,
            marginTop: 13,
          }}
        >
          Report vygenerovaný {formatDateTime(new Date())} · Vizuálna nedeštruktívna obhliadka prístupných častí
        </Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 01 — Súhrn
// ---------------------------------------------------------------------------

function SummaryPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, totals, numbering } = props;
  const tally = overallTally(inspection);
  const assessed = assessedCount(tally);
  const defects = collectDefects(inspection);
  const area = totalFloorArea(inspection);
  const negotiation = negotiationAmount(inspection);

  const okPct = assessed ? (tally.ok / assessed) * 100 : 0;
  const badPct = assessed ? ((tally.v + tally.r) / assessed) * 100 : 0;
  const nPct = assessed ? (tally.n / assessed) * 100 : 0;

  // Where the expected figure sits between the min and max scenario, as the design's marker.
  const span = totals.totalMax - totals.totalMin;
  const markerPct = span > 0 ? ((totals.totalExpected - totals.totalMin) / span) * 100 : 50;

  const severityBreakdown = (() => {
    const counts = new Map<string, number>();
    for (const d of defects) {
      const key = d.severity ? FINDING_SEVERITY_LABELS[d.severity] : "bez určenia";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, n]) => `${n}× ${label.toLowerCase()}`).join(" · ");
  })();

  return (
    <Page size={A4} style={styles.page}>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.suhrn} title="Súhrn protokolu" />

      {inspection.overallConditionRating && (
        <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: -8, marginBottom: 12 }}>
          <Text style={{ fontFamily: "PlexMono", fontSize: 8, color: colors.muted, marginRight: 8 }}>Celkový stav</Text>
          <Text style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 11, color: colors.amber }}>
            {OVERALL_CONDITION_LABELS[inspection.overallConditionRating]}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 9, marginBottom: 11 }}>
        <Tile label="Podlahová plocha">
          {area ? <Metric value={formatNumber(area)} unit="m²" /> : <Metric value="—" />}
        </Tile>
        <Tile label="Zistené vady">
          <Metric value={String(defects.length)} unit="zistení" color={defects.length ? colors.brand : colors.okText} />
        </Tile>
        <Tile label="Hlavné riziko">
          <Text style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 11, lineHeight: 1.15 }}>
            {inspection.mainRisks ? clamp(inspection.mainRisks.split(/[.,;]/)[0], 44) : "Bez hlavného rizika"}
          </Text>
        </Tile>
        <Tile label="Podmienky">
          <Text style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 11, lineHeight: 1.15 }}>
            {clamp(inspection.conditions?.measuringDevices || "Vizuálna obhliadka", 34)}
          </Text>
          <Text style={{ fontSize: 7.5, color: colors.muted, marginTop: 2 }}>
            {[
              inspection.conditions?.occupancy,
              inspection.conditions?.outdoorTemperatureC != null
                ? `${formatNumber(inspection.conditions.outdoorTemperatureC)} °C`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </Text>
        </Tile>
      </View>

      <View style={{ flexDirection: "row", gap: 9, marginBottom: 11 }}>
        <View style={[styles.card, { flex: 1.15 }]} wrap={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
            <Text style={[styles.eyebrowMuted, { marginBottom: 0 }]}>ROZDELENIE HODNOTENÍ</Text>
            <Text style={{ fontSize: 7.5, color: colors.faint }}>{assessed} posudzovaných prvkov</Text>
          </View>
          <View style={{ flexDirection: "row", height: 19, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
            <View style={{ width: `${okPct}%`, backgroundColor: colors.okBar }} />
            <View style={{ width: `${badPct}%`, backgroundColor: colors.brand }} />
            <View style={{ width: `${nPct}%`, backgroundColor: colors.nBar }} />
          </View>
          <View style={{ flexDirection: "row", gap: 14 }}>
            {[
              { n: tally.ok, label: "OK", color: colors.okBar },
              { n: tally.v + tally.r, label: "vady a riziká", color: colors.brand },
              { n: tally.n, label: "neposudzované", color: colors.nBar },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color, marginRight: 5 }}
                />
                <Text style={{ fontSize: 8 }}>
                  <Text style={{ fontWeight: 700 }}>{item.n}</Text> {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.cardSurface, { flex: 1 }]} wrap={false}>
          <Text style={styles.eyebrowMuted}>ODHAD NÁKLADOV NA OBNOVU</Text>
          <Text style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 22, lineHeight: 1.1, color: colors.ink }}>
            {formatNumber(totals.totalExpected, 0)}
            <Text style={{ fontSize: 11, color: colors.muted }}> €</Text>
          </Text>
          <Text style={{ fontSize: 7.5, color: colors.muted, marginTop: 4, marginBottom: 9 }}>
            {inspection.costsIncludeVat ? "vrátane DPH" : "bez DPH"} · očakávaný scenár
          </Text>
          <View style={{ height: 5, backgroundColor: colors.border, borderRadius: 3 }}>
            <View
              style={{
                height: 5,
                width: `${Math.max(0, Math.min(100, markerPct))}%`,
                backgroundColor: colors.brand,
                borderRadius: 3,
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
            <Text style={{ fontFamily: "PlexMono", fontSize: 6.8, color: colors.muted }}>
              min {formatNumber(totals.totalMin, 0)} €
            </Text>
            <Text style={{ fontFamily: "PlexMono", fontSize: 6.8, color: colors.muted }}>
              max {formatNumber(totals.totalMax, 0)} €
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1.5,
          borderColor: colors.brand,
          borderRadius: 9,
          backgroundColor: colors.brandWash,
          padding: 14,
        }}
        wrap={false}
      >
        <View style={{ width: "34%" }}>
          <Text style={[styles.eyebrow, { color: colors.brandDark, marginBottom: 5 }]}>PODKLAD NA VYJEDNÁVANIE</Text>
          <Text style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 18, color: colors.brand }}>
            {formatCurrency(negotiation.amount)}
          </Text>
        </View>
        <View style={{ width: "66%", borderLeftWidth: 1, borderLeftColor: colors.brandWashBorder, paddingLeft: 14 }}>
          <Text style={{ fontSize: 8.6, lineHeight: 1.45, color: colors.body }}>
            {negotiation.derived ? (
              <>
                Orientačný náklad na odstránenie <Text style={{ fontWeight: 700 }}>{defects.length} zistených vád</Text>
                {inspection.contingencyPercent > 0
                  ? ` (vrátane DPH a ${formatNumber(inspection.contingencyPercent, 0)} % rezervy)`
                  : " (vrátane DPH)"}
                . Odporúčame použiť ako východisko pri rokovaní o kúpnej cene.
              </>
            ) : (
              <>
                Zľava odporúčaná poradcom na základe{" "}
                <Text style={{ fontWeight: 700 }}>{defects.length} zistených vád</Text>. Odporúčame použiť ako
                východisko pri rokovaní o kúpnej cene.
              </>
            )}
            {inspection.mainRisks ? (
              <>
                {" "}
                Hlavné riziko — <Text style={{ fontWeight: 700 }}>{inspection.mainRisks}</Text>
              </>
            ) : null}
          </Text>
          {severityBreakdown ? (
            <Text style={{ fontSize: 7.5, color: colors.muted, marginTop: 5 }}>{severityBreakdown}</Text>
          ) : null}
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 02 — Identifikácia a podmienky
// ---------------------------------------------------------------------------

function IdentificationPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, numbering } = props;
  const p = inspection.property;
  const c = inspection.conditions;
  const area = totalFloorArea(inspection);

  const legend: { code: string; text: string }[] = [
    { code: "OK", text: "Bez zistení" },
    { code: "V", text: "Vada, vyžaduje opravu" },
    { code: "R", text: "Riziko, odborné posúdenie" },
    { code: "N", text: "Neposudzované / neprístupné" },
    { code: "NEVZTAHUJE_SA", text: "Nevzťahuje sa" },
  ];

  return (
    <Page size={A4} style={styles.page}>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.identifikacia} title="Identifikácia a podmienky" />

      <View style={{ flexDirection: "row", gap: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>NEHNUTEĽNOSŤ</Text>
          <KeyValues
            rows={[
              ["Adresa", [p?.address, p?.apartmentNumber ? `byt č. ${p.apartmentNumber}` : null].filter(Boolean).join(", ")],
              ["Obec / PSČ", [p?.municipality, p?.postalCode].filter(Boolean).join(" · ")],
              ["Poschodie", p?.floor ?? ""],
              ["Typ nehnuteľnosti", inspection.propertyType ?? ""],
              ["Podlahová plocha", area ? `${formatNumber(area)} m²` : ""],
              ["Stav obývanosti", p?.occupancyStatus ?? ""],
              [
                "Rok výstavby / rekonštr.",
                [p?.constructionYear, p?.lastRenovationYear].filter(Boolean).join(" / "),
              ],
            ]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PROTOKOL A OBHLIADKA</Text>
          <KeyValues
            rows={[
              ["Číslo protokolu", inspection.protocolNumber],
              [
                "Dátum / čas",
                [
                  formatDate(inspection.inspectionDate),
                  inspection.startTime && inspection.endTime ? `${inspection.startTime}–${inspection.endTime}` : null,
                ]
                  .filter((v) => v && v !== "—")
                  .join(" · "),
              ],
              ["Účel obhliadky", inspection.purpose ?? ""],
              ["Objednávateľ", p?.ownerName ?? ""],
              [
                "Počasie / teplota",
                [c?.weather, c?.outdoorTemperatureC != null ? `${formatNumber(c.outdoorTemperatureC)} °C` : null]
                  .filter(Boolean)
                  .join(" · "),
              ],
              ["Prístupnosť priestorov", c?.accessibility ?? ""],
              ["Meracie zariadenia", c?.measuringDevices ?? ""],
            ]}
          />
        </View>
      </View>

      {inspection.participants.length > 0 && (
        <View style={{ marginTop: 16 }} wrap={false}>
          <Text style={styles.eyebrow}>ÚČASTNÍCI OBHLIADKY</Text>
          <KeyValues
            rows={inspection.participants.map((participant) => [
              participant.role || "Účastník",
              [participant.fullName, participant.organisation].filter(Boolean).join(" · "),
            ])}
          />
        </View>
      )}

      {c?.limitations ? (
        <View style={{ marginTop: 16 }} wrap={false}>
          <Text style={styles.eyebrow}>OBMEDZENIA OBHLIADKY</Text>
          <Text style={styles.paragraph}>{c.limitations}</Text>
        </View>
      ) : null}

      <View style={[styles.cardSurface, { marginTop: 18 }]} wrap={false}>
        <Text style={[styles.eyebrowMuted, { marginBottom: 10 }]}>LEGENDA HODNOTENIA</Text>
        <View style={{ flexDirection: "row", gap: 9 }}>
          {legend.map((item) => (
            <View key={item.code} style={{ flex: 1, flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ marginRight: 6 }}>
                <Chip status={item.code} />
              </View>
              <Text style={{ fontSize: 7.6, color: colors.body, flex: 1, lineHeight: 1.35 }}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 03 — Miestnosti (highlights only; the full list is the appendix)
// ---------------------------------------------------------------------------

function RoomCard({ room }: { room: FullInspection["rooms"][number] }) {
  const tally = roomTally(room);
  const area = computeRoomArea(room.lengthM, room.widthM, room.areaOverrideM2);
  const subtitle = [area ? `${formatNumber(area)} m²` : null, room.generalCondition].filter(Boolean).join(" · ");

  const flagged = room.elements
    .filter((e) => e.status === "V" || e.status === "R")
    .sort((a, b) => a.order - b.order);
  const inaccessible = room.elements.filter((e) => e.status === "N");

  return (
    <View
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 9, marginBottom: 10, overflow: "hidden" }}
      wrap={false}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingVertical: 8,
          paddingHorizontal: 11,
        }}
      >
        <View style={{ flex: 1, paddingRight: 6 }}>
          <Text style={{ fontFamily: "Archivo", fontWeight: 700, fontSize: 10 }}>{room.name}</Text>
          {subtitle ? <Text style={{ fontSize: 7, color: colors.muted }}>{subtitle}</Text> : null}
        </View>
        <View style={{ flexDirection: "row" }}>
          {statusCountLine(tally).map((part) => (
            <Text
              key={part.text}
              style={{ fontFamily: "PlexMono", fontWeight: 600, fontSize: 6.8, color: part.color, marginLeft: 6 }}
            >
              {part.text}
            </Text>
          ))}
        </View>
      </View>

      <View style={{ paddingVertical: 8, paddingHorizontal: 11 }}>
        {flagged.length === 0 && inaccessible.length === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.okBar, marginRight: 6 }}
            />
            <Text style={{ fontSize: 8, color: colors.okText }}>
              Bez zistených vád — všetkých {tally.ok} prvkov OK.
            </Text>
          </View>
        ) : (
          <>
            {flagged.map((element) => {
              const condition = element.conditions.filter((c) => !c.excludeFromReport).sort((a, b) => a.order - b.order)[0];
              const detail = condition
                ? [parseJsonStringArray(condition.defectTypes).join(", "), condition.location, condition.extent]
                    .filter(Boolean)
                    .join(", ")
                : elementDetail(element);
              const action = condition
                ? [condition.recommendedAction, condition.deadline ? CONDITION_DEADLINE_LABELS[condition.deadline] : null]
                    .filter(Boolean)
                    .join(", ")
                : "";
              return (
                <View key={element.id} style={{ flexDirection: "row", marginBottom: 5, alignItems: "flex-start" }}>
                  <View style={{ marginRight: 7, marginTop: 0.5 }}>
                    <Chip status={element.status} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 8, lineHeight: 1.4 }}>
                    <Text style={{ fontWeight: 700 }}>{element.label}</Text>
                    {detail ? ` — ${detail}.` : "."}
                    {action ? <Text style={{ color: colors.muted }}> {action}.</Text> : null}
                  </Text>
                </View>
              );
            })}
            {inaccessible.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ marginRight: 7, marginTop: 0.5 }}>
                  <Chip status="N" />
                </View>
                <Text style={{ flex: 1, fontSize: 8, lineHeight: 1.4, color: colors.muted }}>
                  <Text style={{ color: colors.ink, fontWeight: 700 }}>Neprístupné: </Text>
                  {inaccessible.map((e) => e.label.toLowerCase()).join(", ")}.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function RoomsPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, numbering } = props;
  const rooms = inspection.rooms.slice().sort((a, b) => a.order - b.order);

  // Rough height proxy so the two columns end up level: card header, plus the wrapped line count of
  // each reported element (roughly 52 characters to a line at this width).
  const weight = (room: FullInspection["rooms"][number]) => {
    const flagged = room.elements.filter((e) => e.status === "V" || e.status === "R");
    const lines = flagged.reduce((acc, element) => {
      const first = element.conditions.filter((c) => !c.excludeFromReport)[0];
      const text = first
        ? `${element.label}${parseJsonStringArray(first.defectTypes).join(", ")}${first.location}${first.extent}${first.recommendedAction}`
        : `${element.label}${elementDetail(element)}`;
      return acc + Math.max(1, Math.ceil(text.length / 52));
    }, 0);
    const naLine = room.elements.some((e) => e.status === "N") ? 1 : 0;
    return 3.2 + Math.max(1, lines + naLine);
  };
  const [left, right] = splitColumns(rooms, weight);

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead
        number={numbering.miestnosti}
        title="Obhliadka po miestnostiach"
        aside={`${rooms.length} ${rooms.length === 1 ? "miestnosť" : rooms.length < 5 ? "miestnosti" : "miestností"} · zvýraznené sú prvky so zistením`}
      />
      {rooms.length === 0 ? (
        <Text style={styles.paragraph}>Neboli zaznamenané žiadne miestnosti.</Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            {left.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {right.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </View>
        </View>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 04 — Technický stav
// ---------------------------------------------------------------------------

function TechnicalPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, numbering } = props;
  const findingByElementId = new Map(inspection.findings.map((f) => [f.elementId, f]));
  const categories = inspection.categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((c) => c.elements.length > 0);

  const [left, right] = splitColumns(categories, (c) => 2 + c.elements.length);

  const renderCategory = (category: (typeof categories)[number]) => (
    <View key={category.id} style={{ marginBottom: 13 }} wrap={false}>
      <Text style={styles.eyebrow}>{category.name.toUpperCase()}</Text>
      {category.elements
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((element, i, arr) => {
          const finding = findingByElementId.get(element.id);
          const status = finding?.status ?? "OK";
          const detail = finding
            ? [parseJsonStringArray(finding.defectTypes).join(", "), finding.description].filter(Boolean).join(" — ")
            : "";
          return (
            <View
              key={element.id}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingVertical: 3.5,
                borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                borderBottomColor: colors.line,
              }}
            >
              <Text style={{ fontSize: 8.2, flex: 1, paddingRight: 8, lineHeight: 1.35 }}>
                <Text style={detail ? { fontWeight: 700 } : {}}>{element.name}</Text>
                {detail ? <Text style={{ color: colors.muted }}> — {detail}</Text> : null}
              </Text>
              <Chip status={status} />
            </View>
          );
        })}
    </View>
  );

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.technicky} title="Technický stav stavebných prvkov" />
      {categories.length === 0 ? (
        <Text style={styles.paragraph}>Neboli zaznamenané žiadne technické prvky.</Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 18 }}>
          <View style={{ flex: 1 }}>{left.map(renderCategory)}</View>
          <View style={{ flex: 1 }}>{right.map(renderCategory)}</View>
        </View>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 05 — Zistené vady
// ---------------------------------------------------------------------------

function DefectsPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, numbering } = props;
  const defects = collectDefects(inspection);
  const positives = inspection.findings.filter((f) => f.isPositiveObservation);

  const severityAside = (() => {
    const counts = new Map<string, number>();
    for (const d of defects) counts.set(d.severity ?? "—", (counts.get(d.severity ?? "—") ?? 0) + 1);
    const parts = [...counts.entries()].map(
      ([sev, n]) => `${n}× ${sev === "—" ? "bez určenia" : FINDING_SEVERITY_LABELS[sev].toLowerCase()}`
    );
    return `${defects.length} ${defects.length === 1 ? "zistenie" : defects.length < 5 ? "zistenia" : "zistení"}${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
  })();

  const widths = ["8%", "14%", "20%", "38%", "20%"];

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.vady} title="Zistené vady a riziká" aside={defects.length ? severityAside : undefined} />

      {defects.length === 0 ? (
        <View style={[styles.cardSurface, { flexDirection: "row", alignItems: "center" }]}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.okBar, marginRight: 8 }} />
          <Text style={styles.paragraph}>Neboli zistené žiadne vady ani riziká.</Text>
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: "row", backgroundColor: colors.ink, borderRadius: 5 }} fixed>
            {["Hodn.", "Závažnosť", "Prvok", "Popis", "Zdroj"].map((label, i) => (
              <Text key={label} style={[styles.th, { width: widths[i] }]}>
                {label.toUpperCase()}
              </Text>
            ))}
          </View>
          {defects.map((defect) => (
            <View key={defect.id} style={styles.tableRow} wrap={false}>
              <View style={{ width: widths[0], paddingVertical: 6, paddingHorizontal: 7 }}>
                <Chip status={defect.status} />
              </View>
              <Text style={[styles.td, { width: widths[1], color: colors.muted }]}>
                {defect.severity ? FINDING_SEVERITY_LABELS[defect.severity] : "—"}
              </Text>
              <Text style={[styles.td, { width: widths[2], fontWeight: 600 }]}>{defect.label}</Text>
              <Text style={[styles.td, { width: widths[3] }]}>{defect.description || "—"}</Text>
              <Text style={[styles.td, { width: widths[4], color: colors.muted }]}>{defect.source}</Text>
            </View>
          ))}
        </View>
      )}

      {positives.length > 0 && (
        <View style={{ marginTop: 16 }} wrap={false}>
          <Text style={styles.eyebrow}>POZITÍVNE ZISTENIA</Text>
          {positives.map((p) => (
            <Text key={p.id} style={[styles.paragraph, { marginBottom: 2 }]}>
              · {p.description || p.label}
            </Text>
          ))}
        </View>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 06 — Odhad nákladov
// ---------------------------------------------------------------------------

function CostPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, totals, numbering } = props;
  const groups = inspection.costCategories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: inspection.costItems
        .filter((i) => i.categoryId === category.id && i.included)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((g) => g.items.length > 0);

  const [left, right] = splitColumns(groups, (g) => 2 + g.items.length);
  const scenarioMax = Math.max(totals.totalMax, 1);

  const renderGroup = (group: (typeof groups)[number]) => (
    <View key={group.id} style={{ marginBottom: 11 }} wrap={false}>
      <Text style={[styles.eyebrow, { marginBottom: 5 }]}>{group.name.toUpperCase()}</Text>
      {group.items.map((item, i, arr) => {
        const computed = computeCostItem(item, inspection.costsEnteredInclVat);
        const unit = COST_UNIT_LABELS[item.unit] ?? item.unit.toLowerCase();
        const qty = item.quantity && item.quantity !== 1 ? ` (${formatNumber(item.quantity)} ${unit})` : "";
        return (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingVertical: 3,
              borderBottomWidth: i === arr.length - 1 ? 0 : 1,
              borderBottomColor: colors.line,
            }}
          >
            <Text style={{ fontSize: 8.2, flex: 1, paddingRight: 8, lineHeight: 1.35 }}>
              {item.name}
              {qty ? <Text style={{ color: colors.muted }}>{qty}</Text> : null}
            </Text>
            <Text style={{ fontFamily: "PlexMono", fontWeight: 500, fontSize: 8 }}>
              {formatCurrency(computed.priceInclVat)}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.naklady} title="Odhad nákladov na obnovu" />
      <Text style={[styles.note, { marginTop: -6, marginBottom: 14 }]}>
        Odhady sú orientačné, v cenovej úrovni ku dňu obhliadky ({formatDate(inspection.inspectionDate)}),{" "}
        {inspection.costsIncludeVat ? "vrátane DPH" : "bez DPH"}.
        {inspection.costsEnteredInclVat
          ? " Ceny boli zadané ako konečné sumy s DPH; základ dane a DPH sú z nich dopočítané."
          : ""}{" "}
        Nenahrádzajú cenovú ponuku dodávateľa.
      </Text>

      {groups.length === 0 ? (
        <Text style={styles.paragraph}>Neboli zadané žiadne položky odhadu nákladov.</Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 22, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>{left.map(renderGroup)}</View>
          <View style={{ flex: 1 }}>{right.map(renderGroup)}</View>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 14, marginTop: 4 }} wrap={false}>
        <View style={[styles.card, { flex: 1 }]}>
          {[
            ["Spolu bez DPH", formatCurrency(totals.totalExclVat), false],
            ["DPH", formatCurrency(totals.totalVat), true],
          ].map(([label, value, ruled]) => (
            <View
              key={label as string}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 3.5,
                borderBottomWidth: ruled ? 1 : 0,
                borderBottomColor: colors.line,
              }}
            >
              <Text style={{ fontSize: 8.6, color: colors.muted }}>{label as string}</Text>
              <Text style={{ fontFamily: "PlexMono", fontWeight: 500, fontSize: 8.6 }}>{value as string}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 6, paddingBottom: 3 }}>
            <Text style={{ fontSize: 9.4, fontWeight: 700 }}>Spolu s DPH</Text>
            <Text style={{ fontFamily: "PlexMono", fontWeight: 600, fontSize: 9.4 }}>
              {formatCurrency(totals.totalInclVat)}
            </Text>
          </View>
          {inspection.contingencyPercent > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5 }}>
              <Text style={{ fontSize: 8.2, color: colors.muted }}>
                Rezerva {formatNumber(inspection.contingencyPercent, 0)} %
              </Text>
              <Text style={{ fontFamily: "PlexMono", fontSize: 8.2 }}>{formatCurrency(totals.contingencyAmount)}</Text>
            </View>
          )}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              backgroundColor: colors.brand,
              borderRadius: 6,
              paddingVertical: 7,
              paddingHorizontal: 11,
              marginTop: 5,
            }}
          >
            <Text style={{ fontSize: 9.4, fontWeight: 700, color: colors.white }}>Celkom vrátane rezervy</Text>
            <Text style={{ fontFamily: "PlexMono", fontWeight: 600, fontSize: 9.4, color: colors.white }}>
              {formatCurrency(totals.finalTotalWithContingency)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardSurface, { flex: 1 }]}>
          <Text style={[styles.eyebrowMuted, { marginBottom: 11 }]}>SCENÁRE NÁKLADOV</Text>
          {[
            { label: "Minimálny", value: totals.totalMin, color: "#c8b3b1", bold: false },
            { label: "Očakávaný", value: totals.totalExpected, color: colors.brand, bold: true },
            { label: "Maximálny", value: totals.totalMax, color: colors.brandDark, bold: false },
          ].map((scenario) => (
            <View key={scenario.label} style={{ marginBottom: 9 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 8.2, color: scenario.bold ? colors.ink : colors.muted, fontWeight: scenario.bold ? 700 : 400 }}>
                  {scenario.label}
                </Text>
                <Text style={{ fontFamily: "PlexMono", fontSize: 8.2, fontWeight: scenario.bold ? 700 : 500 }}>
                  {formatCurrency(scenario.value)}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
                <View
                  style={{ height: 6, width: `${(scenario.value / scenarioMax) * 100}%`, backgroundColor: scenario.color }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 07 — Odporúčania, vyhlásenie a podpisy
// ---------------------------------------------------------------------------

function RecommendationsPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, numbering } = props;
  const legalItems = [
    settings?.legalVisualNonDestructive,
    settings?.legalNotAReplacement,
    settings?.legalHiddenDefects,
    settings?.legalLimitedByAccess,
    settings?.legalCostsIndicative,
    settings?.legalClientOnly,
  ].filter(Boolean) as string[];
  const [legalLeft, legalRight] = splitColumns(legalItems, (t) => Math.ceil(t.length / 60) + 1);

  const signatures = [
    inspection.signatures.find((s) => s.role === "TECHNICIAN"),
    inspection.signatures.find((s) => s.role === "TECHNICIAN2"),
    inspection.signatures.find((s) => s.role === "CLIENT"),
  ].filter(Boolean);

  // Every category is listed, including NEGOTIATION and CONCLUSION. Those two share a heading with
  // the cards above, but the cards render the inspection's own verdict fields while these are the
  // technician's separate recommendation rows — dropping them to avoid a repeated heading would
  // silently lose whatever they wrote there.
  const grouped = Object.keys(RECOMMENDATION_CATEGORY_LABELS)
    .map((category) => ({
      category,
      items: inspection.recommendations.filter((r) => r.category === category && r.text).sort((a, b) => a.order - b.order),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.odporucania} title="Odporúčania a záver" />

      <View style={{ flexDirection: "row", gap: 13, marginBottom: 14 }}>
        <View style={[styles.card, { flex: 1 }]} wrap={false}>
          <Text style={styles.eyebrow}>PODKLADY PRE VYJEDNÁVANIE</Text>
          <Text style={[styles.paragraph, { marginBottom: 6 }]}>
            {inspection.verdictJustification || "Podklady pre vyjednávanie neboli doplnené."}
          </Text>
          {inspection.overallVerdict && (
            <Text style={styles.paragraph}>
              Odporúčanie poradcu:{" "}
              <Text style={{ fontWeight: 700 }}>{OVERALL_VERDICT_LABELS[inspection.overallVerdict]}</Text>
              {inspection.recommendedDiscountAmount != null && inspection.recommendedDiscountAmount > 0 ? (
                <>
                  {" "}
                  · odporúčaná zľava{" "}
                  <Text style={{ fontWeight: 700, color: colors.brand }}>
                    {formatCurrency(inspection.recommendedDiscountAmount)}
                  </Text>
                </>
              ) : null}
            </Text>
          )}
        </View>
        <View style={[styles.cardSurface, { flex: 1 }]} wrap={false}>
          <Text style={styles.eyebrow}>CELKOVÝ ZÁVER</Text>
          {inspection.overallConditionRating && (
            <Text style={[styles.paragraph, { marginBottom: 6 }]}>
              Celkový stav nehnuteľnosti bol na základe vykonanej obhliadky vyhodnotený ako{" "}
              <Text style={{ fontWeight: 700 }}>
                {OVERALL_CONDITION_LABELS[inspection.overallConditionRating].toLowerCase()}
              </Text>
              .
            </Text>
          )}
          {inspection.mainRisks ? (
            <Text style={[styles.paragraph, { marginBottom: 6 }]}>
              <Text style={{ fontWeight: 700 }}>Hlavné riziká: </Text>
              {inspection.mainRisks}
            </Text>
          ) : null}
          {inspection.immediateActions ? (
            <Text style={[styles.paragraph, { marginBottom: 6 }]}>
              <Text style={{ fontWeight: 700 }}>Okamžité opatrenia: </Text>
              {inspection.immediateActions}
            </Text>
          ) : null}
          {inspection.followUpInspections ? (
            <Text style={styles.paragraph}>
              <Text style={{ fontWeight: 700 }}>Ďalšie obhliadky: </Text>
              {inspection.followUpInspections}
            </Text>
          ) : null}
        </View>
      </View>

      {grouped.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          {grouped.map((group) => (
            <View key={group.category} style={{ marginBottom: 8 }} wrap={false}>
              <Text style={styles.eyebrow}>{RECOMMENDATION_CATEGORY_LABELS[group.category].toUpperCase()}</Text>
              {group.items.map((r) => (
                <View key={r.id} style={{ flexDirection: "row", marginBottom: 2 }}>
                  <Text style={{ color: colors.brand, marginRight: 5, fontSize: 8.6 }}>·</Text>
                  <Text style={[styles.paragraph, { flex: 1 }]}>{r.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <View style={{ borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: 12 }} wrap={false}>
        <Text style={styles.eyebrowMuted}>VYHLÁSENIE A OBMEDZENIA</Text>
        <View style={{ flexDirection: "row", gap: 20 }}>
          {[legalLeft, legalRight].map((column, ci) => (
            <View key={ci} style={{ flex: 1 }}>
              {column.map((text, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Text style={{ color: colors.brand, marginRight: 5, fontSize: 8 }}>·</Text>
                  <Text style={[styles.note, { flex: 1 }]}>{text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 22, marginTop: 16 }}>
          {signatures.length === 0 ? (
            <View style={{ flex: 1 }}>
              <View style={{ height: 34, borderBottomWidth: 1.5, borderBottomColor: colors.ink }} />
              <Text style={[styles.note, { marginTop: 5 }]}>Poradca (technik) · {formatDate(new Date())}</Text>
            </View>
          ) : (
            signatures.map((s) => (
              <View key={s!.id} style={{ flex: 1 }}>
                <View
                  style={{
                    height: 34,
                    borderBottomWidth: 1.5,
                    borderBottomColor: colors.ink,
                    justifyContent: "flex-end",
                  }}
                >
                  {s!.imageDataUrl ? (
                    <Image src={s!.imageDataUrl} style={{ height: 30, objectFit: "contain" }} />
                  ) : null}
                </View>
                <Text style={[styles.note, { marginTop: 5 }]}>
                  {SIGNATURE_ROLE_LABELS[s!.role]}
                  {s!.fullName ? ` · ${s!.fullName}` : ""}
                  {s!.signedAt ? ` · ${formatDate(s!.signedAt)}` : ""}
                </Text>
                {s!.registrationNumber ? (
                  <Text style={[styles.note, { color: colors.faint }]}>Č. {s!.registrationNumber}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Fotodokumentácia
// ---------------------------------------------------------------------------

function parseAnnotations(json: string): Annotation[] {
  try {
    return JSON.parse(json) as Annotation[];
  } catch {
    return [];
  }
}

function PhotoPages(props: Props & { numbering: Numbering }) {
  const { inspection, settings, photoBuffers, numbering } = props;
  const photos = inspection.photos.filter((p) => !p.excludeFromReport).sort((a, b) => a.order - b.order);
  if (photos.length === 0) return null;

  const roomNameById = new Map(inspection.rooms.map((r) => [r.id, r.name]));
  const findingLabelById = new Map(inspection.findings.map((f) => [f.id, f.label]));

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead
        number={numbering.foto}
        title="Fotodokumentácia"
        aside={`${photos.length} ${photos.length === 1 ? "záber" : photos.length < 5 ? "zábery" : "záberov"}`}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
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
                            left: `${a.x}%`,
                            top: `${a.y}%`,
                            fontSize: 6,
                            fontFamily: "PlexMono",
                            fontWeight: 700,
                            backgroundColor: colors.brand,
                            color: colors.white,
                            paddingHorizontal: 2,
                            borderRadius: 2,
                          }}
                        >
                          {a.label}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.photoImage, { backgroundColor: colors.surface }]} />
              )}
              <Text style={{ fontSize: 7, color: colors.body, padding: 6, lineHeight: 1.35 }}>
                <Text style={{ fontFamily: "PlexMono", fontWeight: 600, color: colors.brand }}>{index + 1}. </Text>
                {location ? `${location} — ` : ""}
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
// Občianska vybavenosť (paid add-on)
// ---------------------------------------------------------------------------

const formatDistance = (metres: number) =>
  metres >= 1000 ? `${(metres / 1000).toFixed(1).replace(".", ",")} km` : `${metres} m`;

function AmenitiesPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, logoBuffer, numbering } = props;
  if (!inspection.amenitiesEnabled) return null;

  const included = inspection.amenityPlaces.filter((p) => p.includeInReport && p.name.trim());
  if (included.length === 0) return null;

  const groups = AMENITY_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    places: included.filter((p) => p.category === category.key).sort((a, b) => a.distanceM - b.distanceM),
  })).filter((g) => g.places.length > 0);

  const [left, right] = splitColumns(groups, (g) => 2 + g.places.length);

  const renderGroup = (group: (typeof groups)[number]) => (
    <View key={group.key} style={{ marginBottom: 12 }} wrap={false}>
      <Text style={[styles.eyebrow, { marginBottom: 6 }]}>{group.label.toUpperCase()}</Text>
      {group.places.map((place, i, arr) => (
        <View
          key={place.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingVertical: 3,
            borderBottomWidth: i === arr.length - 1 ? 0 : 1,
            borderBottomColor: colors.line,
          }}
        >
          <Text style={{ fontSize: 8, flex: 1, paddingRight: 8, lineHeight: 1.35 }}>
            {place.name}
            {place.note ? <Text style={{ color: colors.muted }}> — {place.note}</Text> : null}
          </Text>
          <Text style={{ fontFamily: "PlexMono", fontSize: 7.4, color: colors.muted }}>
            {formatDistance(place.distanceM)}
            {place.walkMinutes != null ? ` · ${place.walkMinutes} min` : ""}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.vybavenost} title="Občianska vybavenosť v okolí" />
      <Text style={[styles.note, { marginTop: -6, marginBottom: 14 }]}>
        Vzdialenosti sú vzdušnou líniou, časy sú orientačným odhadom vrátane prirážky na skutočnú trasu.
        {inspection.amenitiesLocationLabel ? ` Vyhodnotené pre: ${inspection.amenitiesLocationLabel}.` : ""}
      </Text>

      <View style={{ flexDirection: "row", gap: 20 }}>
        <View style={{ flex: 1 }}>{left.map(renderGroup)}</View>
        <View style={{ flex: 1 }}>{right.map(renderGroup)}</View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 10,
          marginTop: 4,
        }}
      >
        {logoBuffer ? <Image src={logoBuffer} style={{ height: 12, objectFit: "contain" }} /> : <View />}
        <Text style={{ fontFamily: "PlexMono", fontSize: 6.6, color: colors.faint }}>
          {AMENITY_ATTRIBUTION} · {inspection.protocolNumber}
        </Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Príloha — the complete per-room element list
// ---------------------------------------------------------------------------

function AppendixPage(props: Props & { numbering: Numbering }) {
  const { inspection, settings, numbering } = props;
  const rooms = inspection.rooms.slice().sort((a, b) => a.order - b.order);
  if (rooms.length === 0) return null;

  return (
    <Page size={A4} style={styles.page} wrap>
      <Footer inspection={inspection} settings={settings} />
      <SectionHead number={numbering.priloha} title="Príloha — kompletná obhliadka po miestnostiach" />
      <Text style={[styles.note, { marginTop: -6, marginBottom: 14 }]}>
        Úplný zoznam všetkých posudzovaných prvkov v každej miestnosti vrátane hodnotenia a poznámky. Skratky podľa
        legendy hodnotenia (OK / V / R / N / N/A).
      </Text>

      {rooms.map((room) => {
        const tally = roomTally(room);
        const area = computeRoomArea(room.lengthM, room.widthM, room.areaOverrideM2);
        const subtitle = [area ? `${formatNumber(area)} m²` : null, room.generalCondition].filter(Boolean).join(" · ");
        const elements = room.elements.slice().sort((a, b) => a.order - b.order);
        const [left, right] = splitColumns(elements);

        const renderElement = (element: (typeof elements)[number], i: number, arr: (typeof elements)[number][]) => {
          const isNa = element.status === "NEVZTAHUJE_SA";
          const detail = isNa
            ? "nevzťahuje sa"
            : element.status === "N"
              ? element.naReason
                ? ELEMENT_NA_REASON_LABELS[element.naReason].toLowerCase()
                : "neposúdené"
              : elementDetail(element);
          return (
            <View
              key={element.id}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingVertical: 1.5,
                borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                borderBottomColor: colors.lineSoft,
              }}
              wrap={false}
            >
              <View style={{ marginRight: 6, marginTop: 0.5 }}>
                <Chip status={element.status} />
              </View>
              <Text style={{ flex: 1, fontSize: 7.4, lineHeight: 1.25, color: isNa ? colors.naText : colors.ink }}>
                <Text style={{ fontWeight: 600 }}>{element.label}</Text>
                {detail ? <Text style={{ color: isNa ? colors.naText : colors.fainter }}> — {detail}</Text> : null}
              </Text>
            </View>
          );
        };

        return (
          <View key={room.id} style={{ marginBottom: 12 }} wrap={false}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.ink,
                borderTopLeftRadius: 7,
                borderTopRightRadius: 7,
                paddingVertical: 6,
                paddingHorizontal: 11,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "baseline", flex: 1 }}>
                <Text style={{ fontFamily: "Archivo", fontWeight: 700, fontSize: 9.6, color: colors.white }}>
                  {room.name}
                </Text>
                {subtitle ? (
                  <Text style={{ fontSize: 7, color: colors.onDarkMuted, marginLeft: 8 }}>{subtitle}</Text>
                ) : null}
              </View>
              <View style={{ flexDirection: "row" }}>
                {statusCountLine(tally, true).map((part) => (
                  <Text
                    key={part.text}
                    style={{ fontFamily: "PlexMono", fontWeight: 600, fontSize: 6.4, color: part.color, marginLeft: 6 }}
                  >
                    {part.text}
                  </Text>
                ))}
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 18,
                borderWidth: 1,
                borderTopWidth: 0,
                borderColor: colors.border,
                borderBottomLeftRadius: 7,
                borderBottomRightRadius: 7,
                paddingVertical: 7,
                paddingHorizontal: 11,
              }}
            >
              <View style={{ flex: 1 }}>{left.map(renderElement)}</View>
              <View style={{ flex: 1 }}>{right.map(renderElement)}</View>
            </View>
          </View>
        );
      })}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

function buildNumbering(inspection: FullInspection): Numbering {
  const hasPhotos = inspection.photos.some((p) => !p.excludeFromReport);
  const hasAmenities =
    inspection.amenitiesEnabled && inspection.amenityPlaces.some((p) => p.includeInReport && p.name.trim());
  const hasRooms = inspection.rooms.length > 0;

  const order: SectionKey[] = ["suhrn", "identifikacia", "miestnosti", "technicky", "vady", "naklady", "odporucania"];
  if (hasPhotos) order.push("foto");
  if (hasAmenities) order.push("vybavenost");
  if (hasRooms) order.push("priloha");

  const numbering = {} as Numbering;
  order.forEach((key, i) => {
    numbering[key] = String(i + 1).padStart(2, "0");
  });
  return numbering;
}

export function InspectionDocument(props: Props) {
  const numbering = buildNumbering(props.inspection);
  const withNumbering = { ...props, numbering };
  return (
    <Document title={`${props.inspection.protocolNumber} — Protokol z obhliadky nehnuteľnosti`} language="sk">
      <CoverPage {...props} />
      <SummaryPage {...withNumbering} />
      <IdentificationPage {...withNumbering} />
      <RoomsPage {...withNumbering} />
      <TechnicalPage {...withNumbering} />
      <DefectsPage {...withNumbering} />
      <CostPage {...withNumbering} />
      <RecommendationsPage {...withNumbering} />
      <PhotoPages {...withNumbering} />
      <AmenitiesPage {...withNumbering} />
      <AppendixPage {...withNumbering} />
    </Document>
  );
}
