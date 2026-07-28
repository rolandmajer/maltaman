import { describe, it, expect } from "vitest";
import { normalizeSlovakText, normalizeFields } from "@/lib/slovak-typography";

const NBSP = " ";

describe("normalizeSlovakText — prose mode", () => {
  it("leaves empty and whitespace-only values untouched", () => {
    expect(normalizeSlovakText("")).toBe("");
    expect(normalizeSlovakText("   ")).toBe("   ");
  });

  it("capitalises the first letter and closes the sentence", () => {
    expect(normalizeSlovakText("prasknutá dlažba pri vstupe")).toBe("Prasknutá dlažba pri vstupe.");
  });

  it("capitalises after sentence-ending punctuation", () => {
    expect(normalizeSlovakText("Prvá veta. druhá veta.")).toBe("Prvá veta. Druhá veta.");
  });

  it("collapses double spaces and removes space before punctuation", () => {
    expect(normalizeSlovakText("Trhlina  v stene , pri okne")).toBe(
      `Trhlina v${NBSP}stene, pri okne.`
    );
  });

  it("adds the missing space after a comma", () => {
    expect(normalizeSlovakText("Vlhkosť,pleseň,zatekanie")).toBe("Vlhkosť, pleseň, zatekanie.");
  });

  it("converts straight quotes to Slovak pairs", () => {
    expect(normalizeSlovakText('Klient uviedol "bez problémov" pri obhliadke')).toBe(
      `Klient uviedol „bez problémov“ pri obhliadke.`
    );
  });

  it("turns a spaced hyphen into an en dash", () => {
    expect(normalizeSlovakText("Podlaha - poškriabaná")).toBe("Podlaha – poškriabaná.");
  });

  it("binds one-letter prepositions to the next word", () => {
    expect(normalizeSlovakText("Trhlina v stene a v strope")).toBe(
      `Trhlina v${NBSP}stene a${NBSP}v${NBSP}strope.`
    );
  });

  it("does not double up punctuation that is already correct", () => {
    const already = "Stena je poškodená.";
    expect(normalizeSlovakText(already)).toBe(already);
  });

  it("leaves a one-word label without a trailing period", () => {
    expect(normalizeSlovakText("Slnečno")).toBe("Slnečno");
  });

  it("does not punctuate multi-line lists", () => {
    const list = "Prvý bod\nDruhý bod";
    expect(normalizeSlovakText(list)).toBe(list);
  });

  it("leaves an all-caps ending (abbreviation) alone", () => {
    expect(normalizeSlovakText("Chýba revízna správa NN")).toBe("Chýba revízna správa NN");
  });
});

describe("normalizeSlovakText — label mode", () => {
  it("never appends a period to an address", () => {
    expect(normalizeSlovakText("Hlavná 22", "label")).toBe("Hlavná 22");
  });

  it("never re-cases a picked dropdown value", () => {
    expect(normalizeSlovakText("pri okne", "label")).toBe("pri okne");
  });

  it("still fixes mechanical spacing", () => {
    expect(normalizeSlovakText("Hlavná  22 ,  Martin", "label")).toBe("Hlavná 22, Martin");
  });
});

describe("normalizeFields", () => {
  it("returns only the fields that actually changed", () => {
    const row = { a: "Už správne.", b: "treba opraviť", c: 42 };
    const patch = normalizeFields(row, ["a", "b", "c"]);
    expect(Object.keys(patch)).toEqual(["b"]);
    expect(patch.b).toBe("Treba opraviť.");
  });

  it("returns an empty patch when nothing needs changing", () => {
    expect(normalizeFields({ a: "Hotovo." }, ["a"])).toEqual({});
  });
});
