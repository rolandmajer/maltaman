import { describe, it, expect } from "vitest";
import {
  generateNegotiationBasis,
  generateConclusion,
  type RecommendationInput,
} from "@/lib/recommendation-generator";

const empty: RecommendationInput = {
  defects: [],
  overallConditionRating: null,
  overallVerdict: null,
  mainRisks: "",
  immediateActions: "",
  totalCost: 0,
  costByPriority: [],
  recommendedDiscountAmount: null,
};

function input(over: Partial<RecommendationInput> = {}): RecommendationInput {
  return { ...empty, ...over };
}

describe("generateNegotiationBasis", () => {
  it("produces usable prose from a completely empty inspection", () => {
    const text = generateNegotiationBasis(empty);
    expect(text).toContain("neboli zistené vady");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("NaN");
  });

  it("summarises defect counts by severity", () => {
    const text = generateNegotiationBasis(
      input({
        defects: [
          { severity: "KRITICKA", label: "Elektroinštalácia", location: "Kuchyňa" },
          { severity: "ZAVAZNA", label: "Vlhkosť", location: "Pivnica" },
          { severity: "ZAVAZNA", label: "Strecha", location: "" },
        ],
      })
    );
    expect(text).toContain("3 zistenia");
    expect(text).toContain("1× kritické");
    expect(text).toContain("2× závažné");
  });

  it("agrees the verb with the count, not just the noun", () => {
    const defect = (severity: string) => ({ severity, label: "X", location: "" });
    expect(generateNegotiationBasis(input({ defects: [defect("DROBNA")] }))).toContain(
      "bolo zaznamenané 1 zistenie"
    );
    expect(generateNegotiationBasis(input({ defects: Array(3).fill(defect("DROBNA")) }))).toContain(
      "boli zaznamenané 3 zistenia"
    );
    expect(generateNegotiationBasis(input({ defects: Array(7).fill(defect("DROBNA")) }))).toContain(
      "bolo zaznamenaných 7 zistení"
    );
  });

  it("anchors the negotiation on the total cost and lists the weightiest defects", () => {
    const text = generateNegotiationBasis(
      input({
        defects: [
          { severity: "KRITICKA", label: "Elektroinštalácia", location: "Kuchyňa" },
          { severity: "DROBNA", label: "Odreniny", location: "Chodba" },
        ],
        totalCost: 12500,
        costByPriority: [{ priority: "URGENT", totalInclVat: 9000 }],
      })
    );
    expect(text).toContain("Elektroinštalácia (Kuchyňa)");
    // Only critical/serious defects are worth raising in a price negotiation.
    expect(text).not.toContain("Odreniny");
    expect(text).toMatch(/12\s?500/);
  });

  it("states the recommended discount when one was set", () => {
    const text = generateNegotiationBasis(input({ recommendedDiscountAmount: 8000 }));
    expect(text).toContain("znížení kúpnej ceny");
    expect(text).toMatch(/8\s?000/);
  });

  it("always closes with the orientational-pricing caveat", () => {
    expect(generateNegotiationBasis(empty)).toContain("orientačné");
  });
});

describe("generateConclusion", () => {
  it("handles an empty inspection without producing broken sentences", () => {
    const text = generateConclusion(empty);
    expect(text).toContain("vizuálnou obhliadkou");
    expect(text).not.toContain("undefined");
  });

  it("leads with the overall condition rating when present", () => {
    expect(generateConclusion(input({ overallConditionRating: "ZHORSENY" }))).toContain("zhoršený");
  });

  it("calls out critical and serious counts", () => {
    const text = generateConclusion(
      input({
        defects: [
          { severity: "KRITICKA", label: "A", location: "" },
          { severity: "ZAVAZNA", label: "B", location: "" },
          { severity: "DROBNA", label: "C", location: "" },
        ],
      })
    );
    expect(text).toContain("3 zistenia");
    expect(text).toContain("1× kritické");
    expect(text).toContain("1× závažné");
  });

  it("notes when defects are all minor", () => {
    const text = generateConclusion(
      input({ defects: [{ severity: "DROBNA", label: "A", location: "" }] })
    );
    expect(text).toContain("bez kritických alebo závažných vád");
  });

  it("includes the advisor verdict when chosen", () => {
    expect(generateConclusion(input({ overallVerdict: "PURCHASE_WITH_DISCOUNT" }))).toContain(
      "Kúpa s vyjednaním zľavy z ceny"
    );
  });

  it("always closes with the scope limitation", () => {
    expect(generateConclusion(empty)).toContain("skryté vady");
  });
});
