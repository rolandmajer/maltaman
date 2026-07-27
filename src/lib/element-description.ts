// Auto-generated Slovak description for a RoomElement, assembled from its structured attributes
// and condition entries. Always editable by the technician — see shouldAutoApplyDescription for
// how manual edits are protected from being silently overwritten.

import { DESCRIPTION_TEMPLATES } from "@/lib/constants";

export function parseJsonStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyJsonArray(values: string[]): string {
  return JSON.stringify(values);
}

// Extent values that read naturally as a leading adverb ("lokálne poškriabaná..."). Numeric/
// measured extents (e.g. "0,1–0,5 m²") instead get appended in parentheses at the clause end.
const QUALITATIVE_EXTENTS = new Set(["Bodové", "Lokálne", "Viacnásobné", "Rozsiahle", "Celoplošné", "Nezmerané"]);

type ConditionLike = {
  defectTypes: string; // JSON-encoded string[]
  location: string;
  extent: string;
};

function buildConditionClause(condition: ConditionLike): string {
  const defectTypes = parseJsonStringArray(condition.defectTypes);
  if (defectTypes.length === 0) return "";

  const isQualitative = QUALITATIVE_EXTENTS.has(condition.extent);
  const parts: string[] = [];
  if (condition.extent && isQualitative) parts.push(lowercaseFirst(condition.extent));
  parts.push(defectTypes.map((d) => d.toLowerCase()).join(", "));
  if (condition.location) parts.push(lowercaseFirst(condition.location));

  let clause = parts.join(" ");
  if (condition.extent && !isQualitative) clause += ` (${condition.extent})`;
  return clause;
}

function lowercaseFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

/** Builds the single auto-generated Slovak sentence for a RoomElement. Never throws on sparse data. */
export function generateElementDescription(
  elementKey: string,
  attributes: { attributeKey: string; value: string }[],
  conditions: ConditionLike[]
): string {
  const getAttr = (key: string) => attributes.find((a) => a.attributeKey === key)?.value;
  const template = DESCRIPTION_TEMPLATES[elementKey];
  const lead = template ? template(getAttr) : "";

  const clauses = conditions.map(buildConditionClause).filter(Boolean);
  const conditionsText = clauses.join(" a ");

  if (!lead && !conditionsText) return "";
  if (lead && !conditionsText) return `${lead}.`;
  if (!lead && conditionsText) return `${capitalizeFirst(conditionsText)}.`;
  return `${lead}, ${conditionsText}.`;
}

function capitalizeFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * Decides whether a freshly-computed auto description should be applied directly, or whether the
 * technician's manual edit should be preserved (with the caller showing a non-blocking "a newer
 * automatic version is available" banner instead). Isolated as a pure function so it's unit-
 * testable without mounting the RoomElementCard component.
 */
export function shouldAutoApplyDescription(descriptionIsManual: boolean): boolean {
  return !descriptionIsManual;
}
