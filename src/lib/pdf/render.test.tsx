import { describe, it, expect, afterAll } from "vitest";
import { PDFParse } from "pdf-parse";
import { renderToBuffer, Document, Page, Text } from "@react-pdf/renderer";
import { db } from "@/lib/db";
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

    expect(parsed.text).toContain("PROTOKOL Z OBHLIADKY NEHNUTEĽNOSTI");
    expect(parsed.text).toContain("Legenda hodnotenia");
    expect(parsed.text).toContain("Vyhlásenie, obmedzenia a podpisy");
  });
});
