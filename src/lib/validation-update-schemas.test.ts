import { describe, it, expect } from "vitest";
import {
  costItemUpdateSchema,
  findingUpdateSchema,
  elementConditionUpdateSchema,
  roomUpdateSchema,
} from "@/lib/validation";

/**
 * PATCH bodies carry only the one field the technician just edited. `.partial()` makes every field
 * optional but — contrary to what the name suggests — it *keeps* `.default()`, so zod filled in a
 * default for every field left out and the route wrote all of them back to the database.
 *
 * That silently destroyed data on every inline edit: retyping a cost item's unit price reset its
 * quantity to 1 and its priority to OPTIONAL, and editing a finding's description reset its status
 * to OK — un-flagging a defect the technician had recorded. These tests pin the rule that an
 * update schema must return exactly the keys it was given, nothing more.
 */
describe("update schemas never inject defaults", () => {
  it("keeps a cost-item PATCH to just the edited field", () => {
    const parsed = costItemUpdateSchema.parse({ unitPrice: 1 });
    expect(parsed).toEqual({ unitPrice: 1 });
  });

  it("does not reset a finding's status when only the description is edited", () => {
    const parsed = findingUpdateSchema.parse({ description: "Prasklina pri okne" });
    expect(parsed).toEqual({ description: "Prasklina pri okne" });
    expect(parsed).not.toHaveProperty("status");
  });

  it("does not reset an element condition's flags when only the note is edited", () => {
    const parsed = elementConditionUpdateSchema.parse({ note: "sledovať" });
    expect(parsed).toEqual({ note: "sledovať" });
  });

  it("keeps a room PATCH to just the edited field", () => {
    const parsed = roomUpdateSchema.parse({ name: "Kuchyňa" });
    expect(parsed).toEqual({ name: "Kuchyňa" });
  });

  it("still validates the fields that are supplied", () => {
    expect(() => costItemUpdateSchema.parse({ priority: "NIECO_INE" })).toThrow();
  });

  it("still accepts a full update body", () => {
    const parsed = costItemUpdateSchema.parse({ quantity: 2, unitPrice: 10, priority: "IMMEDIATE" });
    expect(parsed).toMatchObject({ quantity: 2, unitPrice: 10, priority: "IMMEDIATE" });
  });
});
