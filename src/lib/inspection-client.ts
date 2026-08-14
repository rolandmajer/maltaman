export type InspectionClientCandidate = {
  name: string;
  email: string;
  phone: string;
};

type InspectionClientSource = {
  property: { ownerName: string; ownerContact: string } | null;
  participants: Array<{ fullName: string; role: string; email: string; phone: string }>;
};

const EMAIL_PATTERN = /[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/;
const CLIENT_ROLE_PATTERN = /objedn|klient|kupuj|vlastn|majite/i;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function inspectionClientCandidate(source: InspectionClientSource): InspectionClientCandidate | null {
  const participant = source.participants.find(
    (item) => CLIENT_ROLE_PATTERN.test(item.role) && normalizeEmail(item.email),
  );
  if (participant) {
    return {
      name: participant.fullName.trim(),
      email: normalizeEmail(participant.email),
      phone: participant.phone.trim(),
    };
  }

  const ownerContact = source.property?.ownerContact ?? "";
  const email = ownerContact.match(EMAIL_PATTERN)?.[0] ?? "";
  if (!email) return null;

  const phone = ownerContact
    .replace(email, "")
    .split(/[,;]/)
    .map((value) => value.trim())
    .find((value) => /\d{6,}/.test(value.replace(/\D/g, ""))) ?? "";

  return {
    name: source.property?.ownerName.trim() ?? "",
    email: normalizeEmail(email),
    phone,
  };
}
