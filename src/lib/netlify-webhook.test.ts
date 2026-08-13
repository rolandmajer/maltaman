import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseNetlifyChecklistPayload, verifyNetlifyWebhook } from "./netlify-webhook";

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
