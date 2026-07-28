// Generates the two narrative recommendation sections — "Podklady pre vyjednávanie" and
// "Celkový záver" — from data the technician already captured elsewhere in the protocol.
//
// Deliberately a one-shot generator rather than a live-recomputing field: the technician presses
// "Vygenerovať", gets a solid first draft, and then owns the text. Nothing overwrites their edits
// afterwards, and they can re-generate whenever they want a fresh draft.

import {
  FINDING_SEVERITY_LABELS,
  OVERALL_CONDITION_LABELS,
  OVERALL_VERDICT_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

/** Everything the generator reads, flattened so it can be unit-tested without a DB or React. */
export type RecommendationInput = {
  /** One entry per V/R defect in the protocol, from both rooms and Technický stav. */
  defects: { severity: string | null; label: string; location: string }[];
  overallConditionRating: string | null;
  overallVerdict: string | null;
  mainRisks: string;
  immediateActions: string;
  /** Total incl. VAT and contingency — the number that anchors a price negotiation. */
  totalCost: number;
  /** Cost broken down by urgency, highest priority first. */
  costByPriority: { priority: string; totalInclVat: number }[];
  recommendedDiscountAmount: number | null;
};

const SEVERITY_ORDER = ["KRITICKA", "ZAVAZNA", "STREDNA", "DROBNA", "INFORMATIVNA"];

function countBySeverity(defects: RecommendationInput["defects"]) {
  const counts = new Map<string, number>();
  for (const d of defects) {
    const key = d.severity ?? "INFORMATIVNA";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return SEVERITY_ORDER.filter((s) => counts.has(s)).map((s) => ({ severity: s, count: counts.get(s)! }));
}

/** Slovak count agreement for "zistenie": 1 → one, 2–4 → few, 5+ → many. */
function findingWord(n: number) {
  if (n === 1) return "zistenie";
  if (n >= 2 && n <= 4) return "zistenia";
  return "zistení";
}

/**
 * Slovak needs the verb to agree with the count too, not just the noun: "bolo zaznamenané
 * 1 zistenie" / "boli zaznamenané 3 zistenia" / "bolo zaznamenaných 5 zistení".
 */
function recordedPhrase(n: number) {
  if (n === 1) return "bolo zaznamenané 1 zistenie";
  if (n >= 2 && n <= 4) return `boli zaznamenané ${n} ${findingWord(n)}`;
  return `bolo zaznamenaných ${n} ${findingWord(n)}`;
}

/**
 * "Podklady pre vyjednávanie" — the client-facing argument for a price reduction: what was found,
 * what it costs, and which items carry the most weight.
 */
export function generateNegotiationBasis(input: RecommendationInput): string {
  const lines: string[] = [];
  const bySeverity = countBySeverity(input.defects);

  if (input.defects.length === 0) {
    lines.push(
      "Pri obhliadke neboli zistené vady, ktoré by zakladali dôvod na úpravu kúpnej ceny. " +
        "Nasledujúce body slúžia ako podklad pre rokovanie o ďalších podmienkach prevodu."
    );
  } else {
    const severityText = bySeverity
      .map((s) => `${s.count}× ${FINDING_SEVERITY_LABELS[s.severity]?.toLowerCase() ?? s.severity}`)
      .join(", ");
    lines.push(`Pri obhliadke ${recordedPhrase(input.defects.length)} so zistenou vadou alebo rizikom (${severityText}).`);
  }

  if (input.totalCost > 0) {
    lines.push(
      `Orientačný náklad na odstránenie zistených vád predstavuje ${formatCurrency(input.totalCost)} ` +
        "vrátane DPH a rezervy na nepredvídané práce. Túto sumu odporúčame použiť ako východisko pri rokovaní o cene."
    );
  }

  const priorityLines = input.costByPriority.filter((p) => p.totalInclVat > 0);
  if (priorityLines.length > 0) {
    lines.push(
      "Rozdelenie nákladov podľa naliehavosti:\n" +
        priorityLines
          .map((p) => `• ${PRIORITY_LABELS[p.priority] ?? p.priority}: ${formatCurrency(p.totalInclVat)}`)
          .join("\n")
    );
  }

  const weightiest = input.defects
    .filter((d) => d.severity === "KRITICKA" || d.severity === "ZAVAZNA")
    .slice(0, 5);
  if (weightiest.length > 0) {
    lines.push(
      "Najzávažnejšie zistenia, ktoré odporúčame uplatniť pri rokovaní:\n" +
        weightiest.map((d) => `• ${d.label}${d.location ? ` (${d.location})` : ""}`).join("\n")
    );
  }

  if (input.recommendedDiscountAmount != null && input.recommendedDiscountAmount > 0) {
    lines.push(
      `Na základe zisteného stavu odporúčame rokovať o znížení kúpnej ceny o ${formatCurrency(input.recommendedDiscountAmount)}.`
    );
  }

  if (input.mainRisks.trim()) {
    lines.push(`Hlavné riziká, na ktoré je potrebné upozorniť druhú stranu:\n${input.mainRisks.trim()}`);
  }

  lines.push(
    "Uvedené sumy sú orientačné, v cenovej úrovni ku dňu obhliadky, a slúžia ako podklad " +
      "pre rozhodovanie klienta. Nenahrádzajú cenovú ponuku dodávateľa."
  );

  return lines.join("\n\n");
}

/** "Celkový záver" — the short verdict a reader should take away from the protocol. */
export function generateConclusion(input: RecommendationInput): string {
  const lines: string[] = [];
  const bySeverity = countBySeverity(input.defects);
  const critical = bySeverity.find((s) => s.severity === "KRITICKA")?.count ?? 0;
  const serious = bySeverity.find((s) => s.severity === "ZAVAZNA")?.count ?? 0;

  const condition = input.overallConditionRating
    ? OVERALL_CONDITION_LABELS[input.overallConditionRating]?.toLowerCase()
    : null;
  lines.push(
    condition
      ? `Celkový stav nehnuteľnosti bol na základe vykonanej obhliadky vyhodnotený ako ${condition}.`
      : "Nehnuteľnosť bola posúdená vizuálnou obhliadkou bez zásahov do konštrukcií."
  );

  if (input.defects.length === 0) {
    lines.push("Neboli zistené vady ani riziká, ktoré by bránili užívaniu nehnuteľnosti na jej účel.");
  } else {
    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical}× kritické`);
    if (serious > 0) parts.push(`${serious}× závažné`);
    lines.push(
      parts.length > 0
        ? `Celkovo ${recordedPhrase(input.defects.length)}, z toho ${parts.join(" a ")}. ` +
            "Týmto zisteniam odporúčame venovať prednostnú pozornosť."
        : `Celkovo ${recordedPhrase(input.defects.length)} menšieho rozsahu, bez kritických alebo závažných vád.`
    );
  }

  if (input.totalCost > 0) {
    lines.push(
      `Predpokladaný náklad na odstránenie zistených vád je ${formatCurrency(input.totalCost)} vrátane DPH a rezervy.`
    );
  }

  if (input.immediateActions.trim()) {
    lines.push(`Okamžité opatrenia:\n${input.immediateActions.trim()}`);
  }

  if (input.overallVerdict) {
    const verdict = OVERALL_VERDICT_LABELS[input.overallVerdict];
    if (verdict) lines.push(`Odporúčanie poradcu: ${verdict}.`);
  }

  lines.push(
    "Protokol vychádza z vizuálnej obhliadky prístupných častí nehnuteľnosti ku dňu jej vykonania " +
      "a nezahŕňa skryté vady ani časti, ktoré neboli prístupné."
  );

  return lines.join("\n\n");
}
