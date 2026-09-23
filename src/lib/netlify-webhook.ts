import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { propertyTypeForWebsiteService } from "@/lib/website-intake";

type NetlifySignaturePayload = {
  iss?: string;
  sha256?: string;
};

function decodeBase64UrlJson(value: string): NetlifySignaturePayload {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as NetlifySignaturePayload;
}

export function verifyNetlifyWebhook(signature: string | null, rawBody: string, secret: string) {
  if (!signature || !secret) return false;
  const parts = signature.split(".");
  if (parts.length !== 3) return false;

  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string };
    if (header.alg !== "HS256") return false;

    const expected = createHmac("sha256", secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest();
    const received = Buffer.from(parts[2], "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

    const payload = decodeBase64UrlJson(parts[1]);
    const bodyHash = createHash("sha256").update(rawBody).digest("hex");
    return payload.iss === "netlify" && payload.sha256 === bodyHash;
  } catch {
    return false;
  }
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseNetlifyChecklistPayload(value: unknown) {
  const root = record(value);
  const payload = record(root.payload);
  const data = record(payload.data ?? root.data);
  const email = text(data.email ?? payload.email ?? root.email).toLowerCase();
  const externalId = text(payload.id ?? root.id ?? data.id);

  return {
    email,
    externalId,
    name: text(data.name),
    phone: text(data.phone),
    propertyAddress: text(data.propertyAddress ?? data.address),
    propertyType: text(data.propertyType),
    message: text(data.message),
  };
}

const contactSubmissionSchema = z.object({
  id: z.string().trim().min(1),
  formName: z.literal("contact"),
  name: z.string().trim().min(2).max(150),
  email: z.email().max(200),
  phone: z.string().trim().min(6).max(50),
  service: z.enum(["byt", "dom", "novostavba", "konzultacia", "dozor"]),
  location: z.string().trim().min(2).max(300),
  message: z.string().trim().max(3000),
  consent: z.literal(true),
  botField: z.string().trim().max(0),
});

const SERVICE_NAMES = {
  byt: "Obhliadka bytu pred kúpou",
  dom: "Obhliadka domu pred kúpou",
  novostavba: "Preberanie novostavby",
  konzultacia: "Konzultácia pred rekonštrukciou",
  dozor: "Kontrola prác",
} as const;

export function parseNetlifyContactPayload(value: unknown) {
  const root = record(value);
  const payload = record(root.payload);
  const data = record(payload.data ?? root.data);
  const service = text(data.service);
  const parsed = contactSubmissionSchema.parse({
    id: text(payload.id ?? root.id),
    formName: text(payload.form_name ?? root.form_name),
    name: text(data.name),
    email: text(data.email).toLowerCase(),
    phone: text(data.phone),
    service,
    location: text(data.location),
    message: text(data.message),
    consent: data.consent === true || data.consent === "on" || data.consent === "true",
    botField: text(data["bot-field"]),
  });
  return {
    ...parsed,
    externalId: `netlify:contact:${parsed.id}`,
    propertyType: parsed.service === "byt" || parsed.service === "dom" || parsed.service === "novostavba"
      ? propertyTypeForWebsiteService(parsed.service)
      : "",
    leadMessage: [`Služba: ${SERVICE_NAMES[parsed.service]}`, parsed.message].filter(Boolean).join("\n\n"),
  };
}
