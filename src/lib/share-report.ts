// Pure helpers for sharing/e-mailing the PDF report from the export step. Kept free of DOM
// APIs so the wording and client-e-mail detection are unit-testable.

type ParticipantLike = { role: string; email: string };
type ShareableInspection = {
  protocolNumber: string;
  participants: ParticipantLike[];
  property: { address: string; municipality: string; ownerContact: string } | null;
};

/**
 * Best-effort e-mail address of the client (objednávateľ). Prefers a participant whose
 * role/function mentions the client, falls back to an address found in the owner-contact
 * free-text field, otherwise "" (the compose window then opens with an empty recipient).
 */
export function clientEmailFor(inspection: ShareableInspection): string {
  const isClientRole = (role: string) => /objedn|klient|kupuj|vlastn|majite/i.test(role);
  const byRole = inspection.participants.find((p) => isClientRole(p.role) && p.email.trim());
  if (byRole) return byRole.email.trim();

  const ownerContact = inspection.property?.ownerContact ?? "";
  const match = ownerContact.match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/);
  return match ? match[0] : "";
}

/** Human label of the property for subject/body, e.g. "Hlavná 12, Bratislava". */
function propertyLabel(inspection: ShareableInspection): string {
  const parts = [inspection.property?.address, inspection.property?.municipality].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.join(", ");
}

export function reportEmailSubject(inspection: ShareableInspection): string {
  const where = propertyLabel(inspection);
  return `Protokol z obhliadky nehnuteľnosti č. ${inspection.protocolNumber}${where ? ` — ${where}` : ""}`;
}

export function reportEmailBody(inspection: ShareableInspection): string {
  const where = propertyLabel(inspection);
  return [
    "Dobrý deň,",
    "",
    `v prílohe Vám zasielame protokol z obhliadky nehnuteľnosti${where ? ` na adrese ${where}` : ""} (č. ${inspection.protocolNumber}).`,
    "",
    "Protokol zhŕňa zistenia z obhliadky, ich závažnosť, odporúčané ďalšie kroky a orientačný odhad nákladov na odstránenie zistených nedostatkov. Odporúčame venovať pozornosť najmä častiam Zhrnutie zistení a Odporúčania.",
    "",
    "V prípade akýchkoľvek otázok k protokolu nás neváhajte kontaktovať — radi Vám jednotlivé zistenia vysvetlíme.",
    "",
    "S pozdravom",
  ].join("\n");
}

/** Safe attachment filename, e.g. "Protokol-PZ-2026-001.pdf". */
export function reportFileName(inspection: ShareableInspection): string {
  const safe = inspection.protocolNumber.replace(/[^\p{L}\p{N}._-]+/gu, "-");
  return `Protokol-${safe}.pdf`;
}

export function reportMailtoUrl(inspection: ShareableInspection): string {
  const to = clientEmailFor(inspection);
  const params = new URLSearchParams({
    subject: reportEmailSubject(inspection),
    body: reportEmailBody(inspection),
  });
  // URLSearchParams encodes spaces as "+", which mail clients render literally — use %20.
  return `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, "%20")}`;
}
