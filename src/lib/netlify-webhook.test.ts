import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseNetlifyChecklistPayload, parseNetlifyContactPayload, verifyNetlifyWebhook } from "./netlify-webhook";

function sign(body: string, secret: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: "netlify",
      sha256: createHash("sha256").update(body).digest("hex"),
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

describe("Netlify checklist webhook", () => {
  it("verifies a correctly signed raw request body", () => {
    const body = JSON.stringify({ payload: { id: "submission-1", data: { email: "JANA@EXAMPLE.SK" } } });
    expect(verifyNetlifyWebhook(sign(body, "secret"), body, "secret")).toBe(true);
    expect(verifyNetlifyWebhook(sign(body, "wrong"), body, "secret")).toBe(false);
    expect(verifyNetlifyWebhook(sign(body, "secret"), `${body} `, "secret")).toBe(false);
  });

  it("extracts and normalizes checklist fields from the Netlify payload", () => {
    expect(
      parseNetlifyChecklistPayload({
        payload: {
          id: "submission-1",
          data: {
            email: " JANA@EXAMPLE.SK ",
            name: "Jana Nováková",
            phone: "0900 123 456",
            address: "Hlavná 12",
          },
        },
      })
    ).toEqual({
      email: "jana@example.sk",
      externalId: "submission-1",
      name: "Jana Nováková",
      phone: "0900 123 456",
      propertyAddress: "Hlavná 12",
      propertyType: "",
      message: "",
    });
  });
});

describe("Netlify contact webhook", () => {
  const submission = {
    payload: {
      id: "submission-42",
      form_name: "contact",
      data: {
        name: "Jana Nováková",
        email: " JANA@EXAMPLE.SK ",
        phone: "0900 123 456",
        service: "dozor",
        location: "Martin",
        message: "Kontrola prác v piatok",
        consent: "on",
        "bot-field": "",
      },
    },
  };

  it("maps all website services to a named CRM lead and keeps the submission ID", () => {
    for (const [service, propertyType] of Object.entries({
      byt: "APARTMENT", dom: "HOUSE", novostavba: "SHELL", konzultacia: "", dozor: "",
    })) {
      const result = parseNetlifyContactPayload({
        payload: { ...submission.payload, data: { ...submission.payload.data, service } },
      });
      expect(result.externalId).toBe("netlify:contact:submission-42");
      expect(result.propertyType).toBe(propertyType);
      expect(result.leadMessage).toContain("Kontrola prác v piatok");
      expect(result.leadMessage).toContain("Služba:");
    }
  });

  it("rejects other forms, missing consent, and a filled honeypot", () => {
    expect(() => parseNetlifyContactPayload({ payload: { ...submission.payload, form_name: "checklist" } })).toThrow();
    expect(() => parseNetlifyContactPayload({ payload: { ...submission.payload, data: { ...submission.payload.data, consent: "" } } })).toThrow();
    expect(() => parseNetlifyContactPayload({ payload: { ...submission.payload, data: { ...submission.payload.data, "bot-field": "spam" } } })).toThrow();
  });
});
