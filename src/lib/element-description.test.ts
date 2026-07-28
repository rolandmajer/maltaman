import { describe, it, expect } from "vitest";
import {
  generateElementDescription,
  shouldAutoApplyDescription,
  parseJsonStringArray,
  stringifyJsonArray,
  formatAttributeValue,
} from "./element-description";

describe("formatAttributeValue", () => {
  it("passes single-select values through untouched", () => {
    expect(formatAttributeValue("Maľovka")).toBe("Maľovka");
    expect(formatAttributeValue("")).toBe("");
  });

  it("joins a multi-select value into readable text", () => {
    expect(formatAttributeValue('["Maľovka","Keramický obklad"]')).toBe("Maľovka, Keramický obklad");
  });

  it("renders an emptied multi-select as blank rather than leaking \"[]\"", () => {
    expect(formatAttributeValue("[]")).toBe("");
  });
});

describe("parseJsonStringArray / stringifyJsonArray", () => {
  it("round-trips a string array through JSON encoding", () => {
    const values = ["Škáry", "Stopy vlhkosti"];
    expect(parseJsonStringArray(stringifyJsonArray(values))).toEqual(values);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseJsonStringArray("not json")).toEqual([]);
  });
});

describe("generateElementDescription", () => {
  it("returns an empty string for an unconfigured element with no attributes or conditions", () => {
    expect(generateElementDescription("neexistujuci_prvok", [], [])).toBe("");
  });

  it("falls back to a bare element-name lead for a configured element with no attributes selected", () => {
    expect(generateElementDescription("podlaha", [], [])).toBe("Podlaha.");
  });

  it("describes attributes alone when the element has no conditions (OK status)", () => {
    const text = generateElementDescription(
      "podlaha",
      [
        { attributeKey: "typ_podlahy", value: "Laminátová" },
        { attributeKey: "sposob_ulozenia", value: "Plávajúca" },
      ],
      []
    );
    expect(text).toBe("Laminátová podlaha, plávajúca montáž.");
  });

  it("synthesizes attributes plus multiple conditions into one sentence, matching the spec's worked example", () => {
    const text = generateElementDescription(
      "podlaha",
      [
        { attributeKey: "typ_podlahy", value: "Laminátová" },
        { attributeKey: "sposob_ulozenia", value: "Plávajúca" },
      ],
      [
        { defectTypes: JSON.stringify(["Škáry"]), location: "Pri vstupe", extent: "Lokálne" },
        { defectTypes: JSON.stringify(["Stopy vlhkosti"]), location: "Pri balkónových dverách", extent: "0,1–0,5 m²" },
      ]
    );
    expect(text).toContain("Laminátová podlaha, plávajúca montáž");
    expect(text).toContain("lokálne škáry pri vstupe");
    expect(text).toContain("stopy vlhkosti pri balkónových dverách (0,1–0,5 m²)");
  });

  it("never throws on sparse/missing data for an unconfigured element key", () => {
    expect(() => generateElementDescription("neexistujuci_prvok", [], [{ defectTypes: "[]", location: "", extent: "" }])).not.toThrow();
  });
});

describe("shouldAutoApplyDescription", () => {
  it("auto-applies when the description has never been manually edited", () => {
    expect(shouldAutoApplyDescription(false)).toBe(true);
  });

  it("does not auto-apply once the technician has manually edited the description", () => {
    expect(shouldAutoApplyDescription(true)).toBe(false);
  });
});
