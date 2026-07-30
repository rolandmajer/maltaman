import { describe, it, expect } from "vitest";
import { elementDetailFrom } from "@/lib/pdf/inspection-document";

/**
 * The generated element description opens by restating the element it describes. Printed straight
 * after the label that produced it, the appendix filled up with "Zásuvky — Zásuvka." and "Steny —
 * Steny — tehlové murivo…". These pin the trimming: drop the restatement, keep everything else,
 * and never mangle a description that starts with real content.
 */
describe("elementDetailFrom", () => {
  it("prefers the recorded attributes over the description", () => {
    expect(elementDetailFrom("Podlaha", "Podlaha — laminát.", ["Plávajúca", "Laminátová"])).toBe(
      "Plávajúca, Laminátová"
    );
  });

  it("drops a description that only restates the label", () => {
    expect(elementDetailFrom("Vlhkosť", "Vlhkosť.", [])).toBe("");
  });

  it("drops a restatement in a different case ending", () => {
    expect(elementDetailFrom("Zásuvky", "Zásuvka.", [])).toBe("");
    expect(elementDetailFrom("Vypínače", "Vypínač.", [])).toBe("");
    expect(elementDetailFrom("Radiátory", "Radiátor.", [])).toBe("");
    expect(elementDetailFrom("Parapety", "Parapet.", [])).toBe("");
  });

  it("drops a multi-word restatement whole, not just its first word", () => {
    expect(elementDetailFrom("Viditeľná pleseň", "Viditeľná pleseň.", [])).toBe("");
    expect(elementDetailFrom("Tepelné mosty", "Tepelné mosty.", [])).toBe("");
    expect(elementDetailFrom("Nábytok a vstavané prvky", "Nábytok a vstavané prvky.", [])).toBe("");
  });

  it("keeps what follows the restatement", () => {
    expect(elementDetailFrom("Steny", "Steny — tehlové murivo, maľovka.", [])).toBe("tehlové murivo, maľovka.");
  });

  it("keeps a description that opens with real content", () => {
    expect(elementDetailFrom("Podlaha", "Parkety prepadnuté pri okne.", [])).toBe("Parkety prepadnuté pri okne.");
  });

  it("does not strip a different word that merely starts alike", () => {
    // "Vodovod" and "Voda a odpady" share four characters — not enough to be the same term.
    expect(elementDetailFrom("Voda a odpady", "Vodovodná prípojka skorodovaná.", [])).toBe(
      "Vodovodná prípojka skorodovaná."
    );
  });

  it("returns nothing for an empty description", () => {
    expect(elementDetailFrom("Okná", "", [])).toBe("");
    expect(elementDetailFrom("Okná", "   ", [])).toBe("");
  });

  it("drops a restatement of a short label", () => {
    expect(elementDetailFrom("Okná", "Okno.", [])).toBe("");
    expect(elementDetailFrom("Dvere", "Dvere.", [])).toBe("");
  });

  it("ignores an emptied multi-select and falls through to the description", () => {
    // An emptied multi-select stores "[]", which is truthy but must not render as an attribute.
    expect(elementDetailFrom("Okná", "Plast, dvojsklo.", ["[]"])).toBe("Plast, dvojsklo.");
  });

  it("does not collapse two different elements with a common opening", () => {
    expect(elementDetailFrom("Strop", "Steny sú omietnuté.", [])).toBe("Steny sú omietnuté.");
  });
});
