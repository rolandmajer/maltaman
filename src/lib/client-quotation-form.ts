import { createHash, randomBytes } from "node:crypto";

export function createClientFormToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashClientFormToken(token) };
}

export function hashClientFormToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function publicOrigin(headers: Headers, fallbackOrigin: string) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const protocol = headers.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  return host ? `${protocol}://${host}` : fallbackOrigin;
}

export function clientFormEmail(quote: { clientName: string; clientEmail: string }, url: string) {
  const subject = "Údaje k cenovej ponuke obhliadky nehnuteľnosti";
  const greeting = quote.clientName.trim() ? `Dobrý deň, ${quote.clientName.trim()},` : "Dobrý deň,";
  const body = `${greeting}\n\npre prípravu cenovej ponuky na obhliadku nehnuteľnosti, prosím, vyplňte krátky formulár na tomto odkaze:\n\n${url}\n\nPo odoslaní údaje skontrolujeme a pošleme vám finálnu cenovú ponuku.\n\nĎakujeme\nMALTAMAN`;
  const params = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(quote.clientEmail)}?${params.toString().replace(/\+/g, "%20")}`;
}
