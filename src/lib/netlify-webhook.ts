import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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
