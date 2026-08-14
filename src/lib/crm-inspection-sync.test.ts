import { describe, expect, it } from "vitest";
import { inspectionClientCandidate } from "./inspection-client";

describe("inspection CRM customer synchronization", () => {
  it("prefers a participant explicitly identified as the client", () => {
    expect(
      inspectionClientCandidate({
        property: { ownerName: "Vlastník", ownerContact: "owner@example.sk, 0900 000 000" },
        participants: [
          { fullName: "Technik", role: "Poradca", email: "technik@example.sk", phone: "" },
          { fullName: "Jana Klientka", role: "Objednávateľ (klient)", email: " JANA@EXAMPLE.SK ", phone: "0901 222 333" },
        ],
      }),
    ).toEqual({ name: "Jana Klientka", email: "jana@example.sk", phone: "0901 222 333" });
  });

  it("falls back to the owner contact field", () => {
    expect(
      inspectionClientCandidate({
        property: { ownerName: "Ján Novák", ownerContact: "jan@example.sk, +421 900 123 456" },
        participants: [],
      }),
    ).toEqual({ name: "Ján Novák", email: "jan@example.sk", phone: "+421 900 123 456" });
  });

  it("does not create an ambiguous CRM customer without an email", () => {
    expect(
      inspectionClientCandidate({
        property: { ownerName: "Ján Novák", ownerContact: "0900 123 456" },
        participants: [{ fullName: "Ján", role: "Klient", email: "", phone: "0900 123 456" }],
      }),
    ).toBeNull();
  });
});
