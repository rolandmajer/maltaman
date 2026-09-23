import { describe, expect, it } from "vitest";
import { clientFormEmail, createClientFormToken, hashClientFormToken, publicOrigin } from "./client-quotation-form";

describe("client quotation form helpers", () => {
  it("creates a token whose stored value is only a hash", () => {
    const first = createClientFormToken();
    const second = createClientFormToken();
    expect(first.token).not.toBe(first.hash);
    expect(first.hash).toBe(hashClientFormToken(first.token));
    expect(first.token).not.toBe(second.token);
  });

  it("uses forwarded production headers for the public link", () => {
    expect(publicOrigin(new Headers({ "x-forwarded-host": "maltaman.fly.dev", "x-forwarded-proto": "https" }), "http://0.0.0.0:3000")).toBe("https://maltaman.fly.dev");
  });

  it("prepares a client email containing the public link", () => {
    const email = clientFormEmail({ clientName: "Jana", clientEmail: "jana@example.sk" }, "https://example.sk/ponuka/token");
    expect(email).toContain("mailto:jana%40example.sk?");
    expect(decodeURIComponent(email)).toContain("https://example.sk/ponuka/token");
  });
});
