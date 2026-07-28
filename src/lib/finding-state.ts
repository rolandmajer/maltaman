import type { FullInspection, FullFinding } from "@/types/inspection";

/**
 * A Finding row reaches the client twice: once in the flat `inspection.findings` list (what
 * Zhrnutie and Odhad nákladov read) and again nested under
 * `inspection.categories[].elements[].findings` (what Technický stav reads). Both come from the
 * same DB row, so a patch applied to only one copy leaves the other stale — and because
 * InspectionProvider lives in the wizard *layout*, that staleness survives step navigation.
 * Every optimistic finding update must therefore go through this helper.
 */
export function patchFindingEverywhere(
  inspection: FullInspection,
  findingId: string,
  patch: Partial<FullFinding>
): FullInspection {
  const apply = (f: FullFinding) => (f.id === findingId ? { ...f, ...patch } : f);
  return {
    ...inspection,
    findings: inspection.findings.map(apply),
    categories: inspection.categories.map((c) => ({
      ...c,
      elements: c.elements.map((e) => ({ ...e, findings: e.findings.map(apply) })),
    })),
  };
}
