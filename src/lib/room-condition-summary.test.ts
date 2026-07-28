import { describe, it, expect } from "vitest";
import { summariseRoomCondition } from "@/lib/room-element-service";

describe("summariseRoomCondition", () => {
  it("reports nothing to flag when every element is OK", () => {
    expect(summariseRoomCondition(["OK", "OK", "NEVZTAHUJE_SA"])).toBe("Bez zistených vád");
  });

  it("counts defects and risks separately", () => {
    expect(summariseRoomCondition(["V", "V", "R", "OK"])).toBe("2 vady, 1 riziko");
  });

  it("uses Slovak plural agreement across the 1 / 2-4 / 5+ boundaries", () => {
    expect(summariseRoomCondition(["V"])).toBe("1 vada");
    expect(summariseRoomCondition(["V", "V", "V", "V"])).toBe("4 vady");
    expect(summariseRoomCondition(["V", "V", "V", "V", "V"])).toBe("5 vád");
    expect(summariseRoomCondition(["R"])).toBe("1 riziko");
    expect(summariseRoomCondition(["R", "R", "R"])).toBe("3 riziká");
    expect(summariseRoomCondition(Array(6).fill("R"))).toBe("6 rizík");
  });

  it("includes unassessed elements, but not the not-applicable ones", () => {
    expect(summariseRoomCondition(["N", "NEVZTAHUJE_SA"])).toBe("1 neposúdený prvok");
    expect(summariseRoomCondition(["N", "N"])).toBe("2 neposúdené prvky");
    expect(summariseRoomCondition(Array(5).fill("N"))).toBe("5 neposúdených prvkov");
  });

  it("joins all three groups in a fixed order", () => {
    expect(summariseRoomCondition(["N", "R", "V"])).toBe("1 vada, 1 riziko, 1 neposúdený prvok");
  });
});
