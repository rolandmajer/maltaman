import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A report takes seconds to build and roughly 50 MB on the 512 MB machine. Nothing stopped a
 * technician from tapping "Stiahnuť PDF" repeatedly while the first tap was still working — and on
 * a suspended machine the first tap can take ~30s to answer, which invites exactly that. Each tap
 * started its own render, so the memory cost multiplied on a box with headroom for one.
 *
 * These pin the collapsing: overlapping requests for one inspection share a single render, while
 * different inspections and later requests still get their own.
 */

const renderSpy = vi.hoisted(() => vi.fn());

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: renderSpy,
  Document: () => null,
  Page: () => null,
  View: () => null,
  Text: () => null,
  Image: () => null,
  StyleSheet: { create: (s: unknown) => s },
  Font: { register: () => undefined, registerHyphenationCallback: () => undefined },
}));

vi.mock("@/lib/db", () => ({
  db: {
    appSettings: { findUnique: async () => null },
    inspection: { findUnique: async () => null },
  },
}));

vi.mock("@/lib/inspection-service", () => ({
  getFullInspection: async (id: string) => ({
    id,
    organisationId: "org",
    protocolNumber: "PZ-TEST",
    costItems: [],
    costCategories: [],
    rooms: [],
    photos: [],
    contingencyPercent: 0,
    costsEnteredInclVat: false,
  }),
}));

vi.mock("@/lib/storage", () => ({ readPhotoFile: async () => Buffer.alloc(0) }));

const { renderInspectionPdf } = await import("@/lib/pdf/render");

describe("renderInspectionPdf request collapsing", () => {
  beforeEach(() => {
    renderSpy.mockReset();
  });

  it("runs one render for overlapping requests and gives every caller the same buffer", async () => {
    // Held open long enough that all three calls are genuinely overlapping, then asserted only
    // once everything has settled — counting mid-flight depends on how many awaits the render
    // happens to make before reaching the renderer.
    const buffer = Buffer.from("pdf");
    renderSpy.mockImplementation(
      () => new Promise<Buffer>((resolve) => setTimeout(() => resolve(buffer), 20))
    );

    const [ra, rb, rc] = await Promise.all([
      renderInspectionPdf("insp-1"),
      renderInspectionPdf("insp-1"),
      renderInspectionPdf("insp-1"),
    ]);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(ra).toBe(buffer);
    expect(rb).toBe(buffer);
    expect(rc).toBe(buffer);
  });

  it("does not collapse different inspections", async () => {
    renderSpy.mockResolvedValue(Buffer.from("pdf"));

    await Promise.all([renderInspectionPdf("insp-1"), renderInspectionPdf("insp-2")]);

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it("renders again once the previous one has finished, rather than caching a stale report", async () => {
    // Collapsing is only about concurrent taps — a later request must see edits made in between.
    renderSpy.mockResolvedValue(Buffer.from("pdf"));

    await renderInspectionPdf("insp-1");
    await renderInspectionPdf("insp-1");

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it("clears the in-flight entry when a render fails, so a retry is not stuck on the error", async () => {
    renderSpy.mockRejectedValueOnce(new Error("render exploded"));
    await expect(renderInspectionPdf("insp-1")).rejects.toThrow("render exploded");

    renderSpy.mockResolvedValue(Buffer.from("pdf"));
    await expect(renderInspectionPdf("insp-1")).resolves.toBeInstanceOf(Buffer);
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it("propagates a failure to every caller that was waiting on it", async () => {
    renderSpy.mockRejectedValue(new Error("boom"));

    const a = renderInspectionPdf("insp-1");
    const b = renderInspectionPdf("insp-1");

    await expect(a).rejects.toThrow("boom");
    await expect(b).rejects.toThrow("boom");
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
