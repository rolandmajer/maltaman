import { describe, it, expect } from "vitest";
import { patchFindingEverywhere } from "@/lib/finding-state";
import type { FullInspection, FullFinding } from "@/types/inspection";

function finding(id: string, over: Partial<FullFinding> = {}) {
  return { id, status: "OK", severity: null, order: 0, ...over } as FullFinding;
}

/** Minimal shape — patchFindingEverywhere only walks findings/categories. */
function inspectionWith(flat: FullFinding[], nested: FullFinding[]) {
  return {
    findings: flat,
    categories: [{ id: "cat1", elements: [{ id: "el1", findings: nested }] }],
  } as unknown as FullInspection;
}

describe("patchFindingEverywhere", () => {
  it("patches the flat list when the edit came from the nested (Technický stav) copy", () => {
    // The reported bug: setting a technical element to V left inspection.findings stale, so
    // Zhrnutie — which reads only the flat list — never showed the defect.
    const result = patchFindingEverywhere(
      inspectionWith([finding("f1")], [finding("f1")]),
      "f1",
      { status: "V", severity: "ZAVAZNA" }
    );

    expect(result.findings[0].status).toBe("V");
    expect(result.categories[0].elements[0].findings[0].status).toBe("V");
    expect(result.findings[0].severity).toBe("ZAVAZNA");
  });

  it("patches the nested copy when the edit came from Zhrnutie", () => {
    const result = patchFindingEverywhere(
      inspectionWith([finding("f1")], [finding("f1")]),
      "f1",
      { severity: "KRITICKA" }
    );

    expect(result.categories[0].elements[0].findings[0].severity).toBe("KRITICKA");
  });

  it("leaves other findings untouched", () => {
    const result = patchFindingEverywhere(
      inspectionWith([finding("f1"), finding("f2")], [finding("f1")]),
      "f1",
      { status: "R" }
    );

    expect(result.findings[1].status).toBe("OK");
  });

  it("does not mutate the input", () => {
    const before = inspectionWith([finding("f1")], [finding("f1")]);
    patchFindingEverywhere(before, "f1", { status: "V" });

    expect(before.findings[0].status).toBe("OK");
    expect(before.categories[0].elements[0].findings[0].status).toBe("OK");
  });
});
