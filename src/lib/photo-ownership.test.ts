import { describe, it, expect } from "vitest";
import { isRoomOnlyPhoto, isLoosePhoto, type PhotoOwnership } from "@/lib/room-element-service";

/**
 * Duplicating an inspection walks the room tree, the element/condition tree, the findings and the
 * loose photos. A photo tagged to a condition also carries its room's id, so those lists overlap —
 * copying "all the room's photos" and "all its conditions' photos" produced the same image twice.
 * These predicates have to partition the set: every photo matches exactly one copier.
 */
const photo = (over: PhotoOwnership = {}): PhotoOwnership => ({
  roomId: null,
  findingId: null,
  elementId: null,
  roomElementId: null,
  elementConditionId: null,
  ...over,
});

describe("photo ownership", () => {
  it("treats a photo tagged only to a room as room-level", () => {
    expect(isRoomOnlyPhoto(photo({ roomId: "room-1" }))).toBe(true);
  });

  it("does not treat a condition photo as room-level, even though it carries a room id", () => {
    expect(isRoomOnlyPhoto(photo({ roomId: "room-1", elementConditionId: "cond-1" }))).toBe(false);
  });

  it("does not treat a room-element photo as room-level", () => {
    expect(isRoomOnlyPhoto(photo({ roomId: "room-1", roomElementId: "el-1" }))).toBe(false);
  });

  it("treats an untagged photo as loose", () => {
    expect(isLoosePhoto(photo())).toBe(true);
  });

  it("does not treat a room photo as loose", () => {
    expect(isLoosePhoto(photo({ roomId: "room-1" }))).toBe(false);
  });

  it("does not treat a finding photo as loose", () => {
    expect(isLoosePhoto(photo({ findingId: "f-1" }))).toBe(false);
  });

  it("copies every photo exactly once across the two collectors", () => {
    const all = [
      photo(), // loose
      photo({ roomId: "room-1" }), // room-level
      photo({ roomId: "room-1", elementConditionId: "cond-1" }), // condition — copied by the element walk
      photo({ roomId: "room-1", roomElementId: "el-1" }), // element — copied by the element walk
      photo({ findingId: "f-1" }), // finding — copied by the findings walk
    ];

    expect(all.filter(isLoosePhoto)).toHaveLength(1);
    expect(all.filter((p) => p.roomId === "room-1").filter(isRoomOnlyPhoto)).toHaveLength(1);
    // No photo may be claimed by both collectors.
    expect(all.filter((p) => isLoosePhoto(p) && isRoomOnlyPhoto(p) && p.roomId)).toHaveLength(0);
  });
});
