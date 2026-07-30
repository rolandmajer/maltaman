import { describe, it, expect } from "vitest";
import { measurementSchema, recommendationSchema, signatureSchema } from "@/lib/validation";

/**
 * Several rows in this app are created blank and filled in inline afterwards, so their create call
 * legitimately posts empty strings. Requiring content in the schema makes the "add" button fail
 * with a 400 and silently add nothing — which has now happened twice (recommendations, then
 * measurements). These tests pin the placeholder-friendly shape for every such row.
 */
describe("blank-placeholder create schemas", () => {
  it("accepts a blank measurement, as + Pridať meranie posts it", () => {
    const parsed = measurementSchema.parse({ label: "", value: 0, unit: "" });
    expect(parsed.label).toBe("");
    expect(parsed.unit).toBe("");
  });

  it("accepts a measurement with nothing supplied at all", () => {
    expect(() => measurementSchema.parse({})).not.toThrow();
  });

  it("still keeps real measurement values", () => {
    const parsed = measurementSchema.parse({ label: "Vlhkosť", value: 12.5, unit: "%" });
    expect(parsed).toMatchObject({ label: "Vlhkosť", value: 12.5, unit: "%" });
  });

  it("accepts a blank recommendation", () => {
    expect(recommendationSchema.parse({ category: "MAINTENANCE" }).text).toBe("");
  });

  it("accepts a blank signature name", () => {
    expect(signatureSchema.parse({ role: "TECHNICIAN" }).fullName).toBe("");
  });
});
