import { describe, it, expect, afterAll } from "vitest";
import { PDFParse } from "pdf-parse";
import { renderToBuffer, Document, Page, Text } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { getFullInspection } from "@/lib/inspection-service";
import { computeCostItem, computeCostTotals } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { renderInspectionPdf } from "./render";
import { ensureFontsRegistered } from "./fonts";
import { styles } from "./styles";

describe("renderInspectionPdf", () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it("generates a valid, non-trivial PDF for a seeded inspection", async () => {
    const inspection = await db.inspection.findFirst({ orderBy: { createdAt: "asc" } });
    expect(inspection, "expected at least one inspection — run `npm run db:seed` first").toBeTruthy();

    const buffer = await renderInspectionPdf(inspection!.id);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(10_000);
  });

  it("embeds a font that renders the full Slovak diacritic set without dropping characters", async () => {
    // Rendered in isolation (rather than via the full seeded report) so a table-wrapping edge
    // case elsewhere can never mask a real font/encoding regression here, or vice versa.
    ensureFontsRegistered();
    const sample =
      "Podľa vôle objednávateľa sme štvrťročne overili tieto prvky: áčďéíĺľňóôŕšťúýžäÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽÄ.";
    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>{sample}</Text>
        </Page>
      </Document>
    );
    const parsed = await new PDFParse({ data: buffer }).getText();
    expect(parsed.text).toContain(sample);
  });

  it("does not drop characters around fi/fl ligatures (regression: 'Identifikácia')", async () => {
    const inspection = await db.inspection.findFirst({ orderBy: { createdAt: "asc" } });
    expect(inspection).toBeTruthy();

    const buffer = await renderInspectionPdf(inspection!.id);
    const parsed = await new PDFParse({ data: buffer }).getText();

    expect(parsed.text).toContain("Identifikácia");
    expect(parsed.text).not.toContain("Identifkácia");
  });

  it("includes the core report sections", async () => {
    const inspection = await db.inspection.findFirst({ orderBy: { createdAt: "asc" } });
    const buffer = await renderInspectionPdf(inspection!.id);
    const parsed = await new PDFParse({ data: buffer }).getText();

    // Tracked-out labels come back from the extractor with a space between every glyph
    // ("P R O T O K O L"), which is how letterSpacing is encoded. Dropping whitespace on both
    // sides sidesteps it — a targeted un-spacing regex cannot tell that apart from the real space
    // around the one-letter Slovak word "z".
    const squashed = parsed.text.replace(/\s+/g, "");
    const contains = (phrase: string) => expect(squashed).toContain(phrase.replace(/\s+/g, ""));

    contains("PROTOKOL Z OBHLIADKY");
    contains("Súhrn protokolu");
    contains("Identifikácia a podmienky");
    contains("LEGENDA HODNOTENIA");
    contains("Obhliadka po miestnostiach");
    contains("Zistené vady a riziká");
    contains("Odhad nákladov na obnovu");
    contains("Odporúčania a záver");
    contains("VYHLÁSENIE A OBMEDZENIA");
    contains("Príloha — kompletná obhliadka po miestnostiach");
  });

  it("numbers the sections consecutively, with no gap for an omitted optional section", async () => {
    // Photos and Občianska vybavenosť only appear when they have content. The numbers used to be
    // hard-coded, so a report without them printed 11, 13 and skipped 12.
    const inspection = await db.inspection.findFirst({ orderBy: { createdAt: "asc" } });
    const buffer = await renderInspectionPdf(inspection!.id);
    const parsed = await new PDFParse({ data: buffer }).getText();

    const numbers = [...parsed.text.matchAll(/^(\d{2})\s/gm)].map((m) => Number(m[1]));
    const sectionNumbers = [...new Set(numbers)].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);

    expect(sectionNumbers[0]).toBe(1);
    expect(sectionNumbers).toEqual(sectionNumbers.map((_, i) => i + 1));
  });

  it("prints the cost totals that the cost module computed", async () => {
    const inspection = await db.inspection.findFirst({ orderBy: { createdAt: "asc" } });
    const buffer = await renderInspectionPdf(inspection!.id);
    const parsed = await new PDFParse({ data: buffer }).getText();
    const text = parsed.text.replace(/ | /g, " ");

    const full = await getFullInspection(inspection!.id);
    const totals = computeCostTotals(
      full!.costItems.map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        categoryName: "",
        roomId: item.roomId,
        roomName: null,
        priority: item.priority,
        included: item.included,
        ...computeCostItem(item, full!.costsEnteredInclVat),
      })),
      full!.contingencyPercent
    );

    // Formatted the same way the document formats them, so this catches a total that silently
    // stops matching the module it came from.
    for (const value of [totals.totalExclVat, totals.totalInclVat, totals.finalTotalWithContingency]) {
      expect(text).toContain(formatCurrency(value).replace(/ | /g, " "));
    }
  });
});
