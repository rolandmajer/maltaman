// Nearby-amenities lookup for the "Občianska vybavenosť" section.
//
// Two OpenStreetMap services, both free and keyless:
//   • Nominatim — turns the property address into coordinates.
//   • Overpass  — lists points of interest around those coordinates.
//
// Both are volunteer-run and rate-limited, so this runs once per inspection on an explicit button
// press and the result is stored. Nothing here polls or retries in a loop, and every request sends
// a identifying User-Agent as Nominatim's usage policy requires.
//
// The network-facing parts are thin; the arithmetic and shaping live in exported pure functions so
// they can be tested without hitting either service.

import { AMENITY_CATEGORIES, type AmenityCategoryConfig } from "@/lib/constants";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/**
 * Overpass instances are volunteer-run and routinely return 429/504 under load, so we fall through
 * a list of public mirrors rather than failing the whole lookup on the first busy one.
 */
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/** Nominatim asks for a real identifier so they can contact the operator about misuse. */
const USER_AGENT = "MALTAMAN-inspection-app/1.0 (+https://maltaman.fly.dev)";

/** Overpass is volunteer-run and can be slow under load; its own query timeout is 60s. */
const REQUEST_TIMEOUT_MS = 70_000;

export type Coordinates = { lat: number; lng: number };

/**
 * A geocoded address plus the place Nominatim actually matched. The label matters: a loose address
 * like "Hlavná 22, Martin" can resolve to a neighbouring village, which would silently make the
 * whole section describe the wrong location. Showing what was matched lets the technician catch it.
 */
export type GeocodeResult = Coordinates & { label: string };

export type AmenityCandidate = {
  category: string;
  name: string;
  distanceM: number;
  walkMinutes: number | null;
  driveMinutes: number | null;
  lat: number;
  lng: number;
};

/** One element as Overpass returns it — only the fields this module reads. */
export type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Pure geometry / estimates
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres, rounded to the nearest metre. */
export function haversineMetres(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

/**
 * Streets don't run in straight lines, so the real route is longer than the crow-flies distance.
 * 1.3 is the usual planning figure for built-up areas and is what the minute estimates assume —
 * the stored distance itself stays the honest straight-line value.
 */
export const DETOUR_FACTOR = 1.3;

const WALK_METRES_PER_MINUTE = 80; // ~4.8 km/h
const DRIVE_METRES_PER_MINUTE = 500; // ~30 km/h, urban average including junctions

/**
 * Rounded walking minutes, or null when the distance is far enough that nobody would walk it.
 * Always at least 1 minute for anything not literally at the door.
 */
export function walkMinutesFor(distanceM: number): number | null {
  if (distanceM > 5000) return null;
  const minutes = Math.round((distanceM * DETOUR_FACTOR) / WALK_METRES_PER_MINUTE);
  return Math.max(1, minutes);
}

/**
 * Rounded driving minutes, or null when nobody would drive it. Reporting "autom 1 min" for a shop
 * 370 m away reads as filler in a paid report, so anything inside an easy walk gets a walk time
 * only.
 */
export function driveMinutesFor(distanceM: number): number | null {
  if (distanceM < 1000) return null;
  const minutes = Math.round((distanceM * DETOUR_FACTOR) / DRIVE_METRES_PER_MINUTE);
  return Math.max(1, minutes);
}

// ---------------------------------------------------------------------------
// Pure shaping of Overpass results
// ---------------------------------------------------------------------------

/** Coordinates of an element — nodes carry lat/lon, ways/relations carry a computed center. */
function elementCoords(element: OverpassElement): Coordinates | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lng: element.lon };
  }
  if (element.center) return { lat: element.center.lat, lng: element.center.lon };
  return null;
}

/** Slovak name if OSM has one, else the default name. Unnamed features are not reportable. */
function elementName(element: OverpassElement): string | null {
  const tags = element.tags ?? {};
  const name = tags["name:sk"] || tags.name;
  return name?.trim() || null;
}

function matchesCategory(tags: Record<string, string>, category: AmenityCategoryConfig): boolean {
  return category.tags.some((filter) => filter.values.includes(tags[filter.key]));
}

/**
 * Turns raw Overpass elements into report-ready candidates: named only, within the category's
 * radius, nearest first, de-duplicated by name within a category, and capped at the category
 * limit. A place matching several categories is listed under each — a pharmacy inside a
 * supermarket is genuinely both, and the technician can delete what they don't want.
 */
export function buildCandidates(
  elements: OverpassElement[],
  origin: Coordinates,
  categories: AmenityCategoryConfig[] = AMENITY_CATEGORIES
): AmenityCandidate[] {
  const result: AmenityCandidate[] = [];

  for (const category of categories) {
    const seen = new Set<string>();
    const matches: AmenityCandidate[] = [];

    for (const element of elements) {
      const tags = element.tags ?? {};
      if (!matchesCategory(tags, category)) continue;

      const name = elementName(element);
      if (!name) continue;

      const coords = elementCoords(element);
      if (!coords) continue;

      const distanceM = haversineMetres(origin, coords);
      if (distanceM > category.radiusM) continue;

      const dedupeKey = name.toLocaleLowerCase("sk");
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      matches.push({
        category: category.key,
        name,
        distanceM,
        walkMinutes: walkMinutesFor(distanceM),
        driveMinutes: driveMinutesFor(distanceM),
        lat: coords.lat,
        lng: coords.lng,
      });
    }

    matches.sort((a, b) => a.distanceM - b.distanceM);
    result.push(...matches.slice(0, category.limit));
  }

  return result;
}

/**
 * Builds the Overpass QL query — one node/way clause pair per tag filter, each scoped to its own
 * category's radius.
 *
 * Scoping matters: querying every tag at the widest radius any category asks for made Overpass
 * time out, because it pulled e.g. every bus stop within 5 km when bus stops are only wanted
 * within 1.5 km. Identical clauses are emitted once, so categories sharing a tag and radius don't
 * double the work.
 */
export function buildOverpassQuery(
  origin: Coordinates,
  categories: AmenityCategoryConfig[] = AMENITY_CATEGORIES
): string {
  const clauses = new Set<string>();

  for (const category of categories) {
    for (const filter of category.tags) {
      const alternation = filter.values.join("|");
      const scope = `(around:${category.radiusM},${origin.lat},${origin.lng})`;
      clauses.add(`node["${filter.key}"~"^(${alternation})$"]${scope};`);
      clauses.add(`way["${filter.key}"~"^(${alternation})$"]${scope};`);
    }
  }

  return `[out:json][timeout:60];(${[...clauses].join("")});out center tags;`;
}

/** Full postal address string for geocoding, from the property's separate fields. */
export function buildGeocodeQuery(property: {
  address?: string | null;
  municipality?: string | null;
  postalCode?: string | null;
}): string {
  return [property.address, property.postalCode, property.municipality, "Slovensko"]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class AmenityLookupError extends Error {}

/** Geocodes a free-text address. Returns null when the address simply isn't found. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;

  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=sk&q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) {
    throw new AmenityLookupError(`Geokódovanie adresy zlyhalo (HTTP ${res.status}).`);
  }

  const results = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const first = results?.[0];
  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: first.display_name?.trim() || query };
}

/**
 * Fetches points of interest around a point and shapes them into report-ready candidates.
 * Tries each Overpass mirror in turn — a busy or unreachable instance moves on to the next, and
 * only an all-mirrors failure surfaces to the technician.
 */
export async function fetchAmenities(origin: Coordinates): Promise<AmenityCandidate[]> {
  const body = new URLSearchParams({ data: buildOverpassQuery(origin) }).toString();
  let lastStatus: number | null = null;

  for (const url of OVERPASS_URLS) {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch {
      continue; // timeout or network error — try the next mirror
    }

    if (res.ok) {
      const parsed = (await res.json()) as { elements?: OverpassElement[] };
      return buildCandidates(parsed.elements ?? [], origin);
    }
    lastStatus = res.status;
  }

  throw new AmenityLookupError(
    lastStatus === 429 || lastStatus === 504
      ? "Služba OpenStreetMap je momentálne vyťažená. Skúste to znova o minútu."
      : `Načítanie okolia zlyhalo${lastStatus ? ` (HTTP ${lastStatus})` : ""}.`
  );
}
