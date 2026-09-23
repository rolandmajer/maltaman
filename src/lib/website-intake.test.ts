import { describe, expect, it } from "vitest";
import { propertyTypeForWebsiteService, websiteIntakeSchema } from "./website-intake";

describe("website intake", () => {
  it("maps website services to quotation property types", () => {
    expect(propertyTypeForWebsiteService("byt")).toBe("APARTMENT");
    expect(propertyTypeForWebsiteService("dom")).toBe("HOUSE");
    expect(propertyTypeForWebsiteService("novostavba")).toBe("SHELL");
  });

  it("rejects a filled honeypot", () => {
    expect(() => websiteIntakeSchema.parse({
      intakeId: "12345678",
      name: "Test Klient",
      email: "test@example.com",
      phone: "+421900000000",
      service: "byt",
      location: "Martin",
      message: "Test",
      consent: true,
      botField: "spam",
    })).toThrow();
  });
});
