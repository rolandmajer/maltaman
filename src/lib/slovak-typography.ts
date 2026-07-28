// Slovak typographic clean-up applied to every free-text field when a protocol is completed.
//
// On-site the technician types fast on a phone: lowercase starts, missing final periods, double
// spaces, a space before a comma, straight quotes. None of that is worth interrupting them for
// while they work — so it is normalised once, at completion, before the document becomes a
// finished report.
//
// Deliberately conservative: it only fixes mechanical typography. It never rewords, never
// re-cases anything beyond the first letter of a sentence, and never touches text that would
// change meaning. Anything ambiguous is left exactly as typed.

/**
 * Slovak one-letter prepositions and conjunctions. Typographic convention is that these must not
 * be left dangling at the end of a line, so they are bound to the next word with a non-breaking
 * space. Includes the vocalised forms (so, zo, vo, ku) which follow the same rule.
 */
const SHORT_WORDS = ["a", "i", "k", "o", "s", "u", "v", "z", "so", "zo", "vo", "ku"];

const NBSP = " ";

/** Straight quotes → Slovak „low-high" pairs, applied to balanced pairs only. */
function fixQuotes(text: string): string {
  let open = true;
  return text.replace(/"/g, () => {
    const mark = open ? "„" : "“";
    open = !open;
    return mark;
  });
}

/** Collapses runs of spaces/tabs and removes space sitting before , . ; : ! ? ) */
function fixSpacing(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+([,.;:!?)])/g, "$1")
    .replace(/\(\s+/g, "(")
    // Ensure a space *after* a comma/semicolon/colon when a word follows directly.
    .replace(/([,;:])(?=[^\s\d])/g, "$1 ")
    // Collapse 3+ blank lines to a single blank line.
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n");
}

/** " - " used as an aside → a proper en dash, the Slovak convention. */
function fixDashes(text: string): string {
  return text.replace(/ +- +/g, " – ");
}

/**
 * Binds one-letter prepositions to the following word with a non-breaking space. Uses a lookbehind
 * so the preceding separator is not consumed — otherwise consecutive short words ("a v strope",
 * very common in Slovak) would only bind the first one.
 */
function bindShortWords(text: string): string {
  const pattern = new RegExp(`(?<=^|[\\s(„])(${SHORT_WORDS.join("|")})[ \\t]+(?=\\S)`, "gi");
  return text.replace(pattern, (_m, word: string) => `${word}${NBSP}`);
}

/** Uppercases the first letter of the text and of each sentence following . ! ? */
function fixSentenceCase(text: string): string {
  return text
    .replace(/^(\s*)(\p{Ll})/u, (_m, ws: string, ch: string) => ws + ch.toUpperCase())
    .replace(/([.!?]\s+)(\p{Ll})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Adds a closing period when the text is prose that clearly lacks one. Skipped when the text
 * already ends in punctuation, is a bullet/multi-line list, or is a short label-like fragment
 * (a single word, a measurement, a code) where a period would look wrong.
 */
function addFinalPeriod(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) return text;
  if (/[.!?:;)…]$/.test(trimmed)) return trimmed;
  // Lists: each line is its own item, adding one period to the last line only would be odd.
  if (/\n/.test(trimmed)) return trimmed;
  // Needs at least two words to read as a sentence rather than a label.
  if (trimmed.split(/\s+/).length < 2) return trimmed;
  // Don't punctuate something ending in an abbreviation-like token ("č. 5", "m2", "TV").
  if (/\b[A-ZÁČĎÉÍĽĹŇÓŔŠŤÚÝŽ]{2,}$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

/**
 * How much to normalise:
 *  • "prose"  — full treatment, for sentences the technician wrote (notes, causes, conclusions).
 *  • "label"  — mechanical fixes only. Used for names, addresses and picked dropdown values,
 *               where sentence-casing or a trailing period would be wrong ("Hlavná 22." is not
 *               an address, "Pri okne." is not a location).
 */
export type NormalizeMode = "prose" | "label";

/**
 * Normalises one free-text value. Returns the input unchanged when it is empty or whitespace,
 * so blank fields stay blank rather than becoming a stray period.
 */
export function normalizeSlovakText(raw: string, mode: NormalizeMode = "prose"): string {
  if (!raw || !raw.trim()) return raw;

  let text = raw.trim();
  text = fixQuotes(text);
  text = fixSpacing(text);
  text = fixDashes(text);
  if (mode === "prose") {
    text = fixSentenceCase(text);
    text = addFinalPeriod(text);
  }
  // Last, so earlier regexes can rely on plain spaces.
  text = bindShortWords(text);
  return text;
}

/** Applies normalizeSlovakText to the named string fields of a record, skipping unchanged ones. */
export function normalizeFields<T extends Record<string, unknown>>(
  row: T,
  fields: readonly (keyof T & string)[],
  mode: NormalizeMode = "prose"
): Partial<Record<keyof T & string, string>> {
  const patch: Partial<Record<keyof T & string, string>> = {};
  for (const field of fields) {
    const value = row[field];
    if (typeof value !== "string") continue;
    const next = normalizeSlovakText(value, mode);
    if (next !== value) patch[field] = next;
  }
  return patch;
}
