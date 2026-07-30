import { describe, it, expect } from "vitest";
import {
  haversineMetres,
  walkMinutesFor,
  driveMinutesFor,
  buildCandidates,
  buildOverpassQuery,
  buildGeocodeQuery,
  buildViewbox,
  type OverpassElement,
} from "@/lib/amenities";
import type { AmenityCategoryConfig } from "@/lib/constants";

// Martin, Slovakia — a real point so the distances are sanity-checkable against a map.
const ORIGIN = { lat: 49.0665, lng: 18.9218 };

describe("haversineMetres", () => {
  it("is zero for the same point", () => {
    expect(haversineMetres(ORIGIN, ORIGIN)).toBe(0);
  });

  it("matches a known short distance", () => {
    // 0.001° of latitude is ~111 m anywhere on Earth.
    expect(haversineMetres(ORIGIN, { ...ORIGIN, lat: ORIGIN.lat + 0.001 })).toBeGreaterThan(105);
    expect(haversineMetres(ORIGIN, { ...ORIGIN, lat: ORIGIN.lat + 0.001 })).toBeLessThan(118);
  });

  it("is symmetric", () => {
    const other = { lat: 49.07, lng: 18.93 };
    expect(haversineMetres(ORIGIN, other)).toBe(haversineMetres(other, ORIGIN));
  });
});

describe("walkMinutesFor", () => {
  it("never reports less than a minute for a real distance", () => {
    expect(walkMinutesFor(10)).toBe(1);
  });

  it("applies the detour factor rather than the straight line", () => {
    // 800 m straight line → 1040 m walked → 13 min at 80 m/min.
    expect(walkMinutesFor(800)).toBe(13);
  });

  it("gives up beyond a walkable distance", () => {
    expect(walkMinutesFor(5001)).toBeNull();
  });
});

describe("driveMinutesFor", () => {
  it("returns null for anything within an easy walk", () => {
    // "autom 1 min" for a shop 400 m away reads as filler in a paid report.
    expect(driveMinutesFor(250)).toBeNull();
    expect(driveMinutesFor(999)).toBeNull();
    expect(driveMinutesFor(1000)).not.toBeNull();
  });

  it("estimates from the detour-adjusted distance", () => {
    // 3000 m → 3900 m driven → ~8 min at 500 m/min.
    expect(driveMinutesFor(3000)).toBe(8);
  });
});

describe("buildGeocodeQuery", () => {
  it("joins the address parts and pins the country", () => {
    expect(buildGeocodeQuery({ address: "Hlavná 22", municipality: "Martin", postalCode: "036 01" })).toBe(
      "Hlavná 22, 036 01, Martin, Slovensko"
    );
  });

  it("skips blank parts instead of leaving empty commas", () => {
    expect(buildGeocodeQuery({ address: "Hlavná 22", municipality: "", postalCode: null })).toBe(
      "Hlavná 22, Slovensko"
    );
  });
});

const SHOPS: AmenityCategoryConfig = {
  key: "obchody",
  label: "Obchody",
  tags: [{ key: "shop", values: ["supermarket", "convenience"] }],
  radiusM: 1000,
  limit: 2,
};

/** Places an element roughly `metres` north of the origin. */
function elementAt(metres: number, tags: Record<string, string>): OverpassElement {
  return { lat: ORIGIN.lat + metres / 111_320, lon: ORIGIN.lng, tags };
}

describe("buildCandidates", () => {
  it("keeps only named places", () => {
    const result = buildCandidates(
      [elementAt(100, { shop: "supermarket" }), elementAt(150, { shop: "supermarket", name: "Billa" })],
      ORIGIN,
      [SHOPS]
    );
    expect(result.map((r) => r.name)).toEqual(["Billa"]);
  });

  it("prefers the Slovak name when OSM has one", () => {
    const result = buildCandidates(
      [elementAt(100, { shop: "supermarket", name: "Store", "name:sk": "Predajňa" })],
      ORIGIN,
      [SHOPS]
    );
    expect(result[0].name).toBe("Predajňa");
  });

  it("drops anything beyond the category radius", () => {
    const result = buildCandidates([elementAt(1500, { shop: "supermarket", name: "Ďaleko" })], ORIGIN, [SHOPS]);
    expect(result).toEqual([]);
  });

  it("returns nearest first and respects the category limit", () => {
    const result = buildCandidates(
      [
        elementAt(900, { shop: "supermarket", name: "Tretia" }),
        elementAt(100, { shop: "supermarket", name: "Prvá" }),
        elementAt(400, { shop: "convenience", name: "Druhá" }),
      ],
      ORIGIN,
      [SHOPS]
    );
    expect(result.map((r) => r.name)).toEqual(["Prvá", "Druhá"]);
  });

  it("de-duplicates repeated names within a category, case-insensitively", () => {
    const result = buildCandidates(
      [
        elementAt(100, { shop: "supermarket", name: "Billa" }),
        elementAt(200, { shop: "supermarket", name: "BILLA" }),
      ],
      ORIGIN,
      [SHOPS]
    );
    expect(result).toHaveLength(1);
  });

  it("uses the computed centre for ways, which have no lat/lon of their own", () => {
    const way: OverpassElement = {
      type: "way",
      center: { lat: ORIGIN.lat + 0.001, lon: ORIGIN.lng },
      tags: { shop: "supermarket", name: "Park Shop" },
    };
    expect(buildCandidates([way], ORIGIN, [SHOPS])).toHaveLength(1);
  });

  it("attaches walk and drive estimates", () => {
    const [place] = buildCandidates([elementAt(500, { shop: "supermarket", name: "Blízko" })], ORIGIN, [SHOPS]);
    expect(place.walkMinutes).toBeGreaterThan(0);
    expect(place.distanceM).toBeGreaterThan(450);
  });

  it("ignores elements that match no configured tag", () => {
    expect(buildCandidates([elementAt(100, { amenity: "bench", name: "Lavička" })], ORIGIN, [SHOPS])).toEqual([]);
  });
});

describe("buildViewbox", () => {
  it("emits the four corners in Nominatim's lon,lat,lon,lat order", () => {
    const parts = buildViewbox(ORIGIN, 1000).split(",").map(Number);
    expect(parts).toHaveLength(4);
    const [lonLeft, latTop, lonRight, latBottom] = parts;
    expect(lonLeft).toBeLessThan(ORIGIN.lng);
    expect(lonRight).toBeGreaterThan(ORIGIN.lng);
    expect(latTop).toBeGreaterThan(ORIGIN.lat);
    expect(latBottom).toBeLessThan(ORIGIN.lat);
  });

  it("widens the longitude span more than the latitude span at Slovak latitudes", () => {
    // A degree of longitude is shorter than a degree of latitude away from the equator, so the
    // same distance in metres needs a bigger longitude delta — otherwise the box is too narrow.
    const [lonLeft, latTop, , latBottom] = buildViewbox(ORIGIN, 1000).split(",").map(Number);
    const lngSpan = ORIGIN.lng - lonLeft;
    const latSpan = (latTop - latBottom) / 2;
    expect(lngSpan).toBeGreaterThan(latSpan);
  });

  it("grows with the radius", () => {
    const small = Number(buildViewbox(ORIGIN, 1000).split(",")[1]);
    const large = Number(buildViewbox(ORIGIN, 8000).split(",")[1]);
    expect(large).toBeGreaterThan(small);
  });
});

describe("buildOverpassQuery", () => {
  it("queries both nodes and ways for each tag key", () => {
    const query = buildOverpassQuery(ORIGIN, [SHOPS]);
    expect(query).toContain('node["shop"');
    expect(query).toContain('way["shop"');
  });

  it("scopes each category to its own radius rather than the widest one", () => {
    // Querying every tag at the widest radius made Overpass time out on a real address.
    const near = { ...SHOPS, key: "a", radiusM: 500 };
    const far = { ...SHOPS, key: "b", tags: [{ key: "amenity", values: ["hospital"] }], radiusM: 5000 };
    const query = buildOverpassQuery(ORIGIN, [near, far]);
    expect(query).toContain('node["shop"~"^(supermarket|convenience)$"](around:500');
    expect(query).toContain('node["amenity"~"^(hospital)$"](around:5000');
    expect(query).not.toContain('node["shop"~"^(supermarket|convenience)$"](around:5000');
  });

  it("merges values sharing a tag key into a single alternation", () => {
    const query = buildOverpassQuery(ORIGIN, [SHOPS]);
    expect(query).toContain("supermarket|convenience");
  });

  it("emits an identical clause only once", () => {
    const a = { ...SHOPS, key: "a" };
    const b = { ...SHOPS, key: "b" };
    const query = buildOverpassQuery(ORIGIN, [a, b]);
    expect(query.split('node["shop"').length - 1).toBe(1);
  });

  it("asks for centres and tags so ways are usable", () => {
    expect(buildOverpassQuery(ORIGIN, [SHOPS])).toContain("out center tags;");
  });
});
