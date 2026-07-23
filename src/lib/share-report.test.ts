import { describe, expect, it } from "vitest";
import { clientEmailFor, reportEmailBody, reportEmailSubject, reportFileName, reportMailtoUrl } from "./share-report";

const base = {
  protocolNumber: "PZ-2026/001",
  participants: [] as { role: string; email: string }[],
  property: { address: "Hlavná 12", municipality: "Bratislava", ownerContact: "" },
};

describe("clientEmailFor", () => {
  it("prefers a participant whose role mentions the client", () => {
    const inspection = {
      ...base,
      participants: [
        { role: "Poradca (technik)", email: "technik@maltaman.sk" },
        { role: "Objednávateľ (klient)", email: "klient@example.com" },
      ],
    };
    expect(clientEmailFor(inspection)).toBe("klient@example.com");
  });

  it("matches other client-like roles (kupujúci, vlastník) case-insensitively", () => {
    expect(clientEmailFor({ ...base, participants: [{ role: "KUPUJÚCI", email: "k@e.sk" }] })).toBe("k@e.sk");
    expect(clientEmailFor({ ...base, participants: [{ role: "vlastník bytu", email: "v@e.sk" }] })).toBe("v@e.sk");
  });

  it("skips client participants without an e-mail and falls back to owner contact", () => {
    const inspection = {
      ...base,
      participants: [{ role: "Objednávateľ", email: "  " }],
      property: { ...base.property, ownerContact: "Ján Vlastník, jan.vlastnik@example.com, 0900 123 456" },
    };
    expect(clientEmailFor(inspection)).toBe("jan.vlastnik@example.com");
  });

  it("returns empty string when nothing is available (blank recipient)", () => {
    expect(clientEmailFor({ ...base, property: { ...base.property, ownerContact: "0900 123 456" } })).toBe("");
    expect(clientEmailFor({ ...base, property: null })).toBe("");
  });
});

describe("wording", () => {
  it("subject contains protocol number and address", () => {
    expect(reportEmailSubject(base)).toBe("Protokol z obhliadky nehnuteľnosti č. PZ-2026/001 — Hlavná 12, Bratislava");
  });

  it("subject omits the dash when there is no address", () => {
    expect(reportEmailSubject({ ...base, property: null })).toBe("Protokol z obhliadky nehnuteľnosti č. PZ-2026/001");
  });

  it("body is polite, mentions the attachment, the address and questions", () => {
    const body = reportEmailBody(base);
    expect(body).toMatch(/^Dobrý deň,/);
    expect(body).toContain("v prílohe");
    expect(body).toContain("Hlavná 12, Bratislava");
    expect(body).toContain("neváhajte kontaktovať");
    expect(body).toMatch(/S pozdravom$/);
  });
});

describe("reportFileName", () => {
  it("sanitises the protocol number for use as a filename", () => {
    expect(reportFileName(base)).toBe("Protokol-PZ-2026-001.pdf");
  });
});

describe("reportMailtoUrl", () => {
  it("prefills recipient, subject and body without literal plus signs", () => {
    const url = reportMailtoUrl({
      ...base,
      participants: [{ role: "Klient", email: "klient@example.com" }],
    });
    expect(url.startsWith("mailto:klient%40example.com?")).toBe(true);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
    expect(url).not.toContain("+");
    expect(decodeURIComponent(url)).toContain("Dobrý deň,");
  });

  it("leaves the recipient blank when no client e-mail exists", () => {
    expect(reportMailtoUrl({ ...base, property: null }).startsWith("mailto:?")).toBe(true);
  });
});
