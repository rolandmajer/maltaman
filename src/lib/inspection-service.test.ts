import { describe, it, expect } from "vitest";
import { stripId } from "@/lib/inspection-service";

/**
 * Duplicating an inspection re-creates `property` and `conditions` as nested creates. Prisma sets
 * the parent relation itself and rejects an explicit `inspectionId` inside a nested create, so
 * spreading the source row verbatim made every duplicate — and therefore every revision — fail
 * with a 500. TypeScript cannot catch it: an object spread skips excess-property checking.
 */
describe("stripId", () => {
  it("removes the primary key and the parent foreign key", () => {
    const row = {
      id: "abc",
      inspectionId: "insp-1",
      street: "Hlavná 1",
      city: "Bratislava",
    };

    expect(stripId(row)).toEqual({ street: "Hlavná 1", city: "Bratislava" });
  });

  it("keeps falsy and null payload values", () => {
    const row = { id: "abc", inspectionId: "insp-1", floorCount: 0, note: null, heated: false };

    expect(stripId(row)).toEqual({ floorCount: 0, note: null, heated: false });
  });

  it("works on a row that has no parent foreign key", () => {
    expect(stripId({ id: "abc", name: "Kuchyňa" })).toEqual({ name: "Kuchyňa" });
  });
});
