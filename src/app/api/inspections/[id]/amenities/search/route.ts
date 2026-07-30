import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import {
  AmenityLookupError,
  buildGeocodeQuery,
  fetchCategoryCandidates,
  geocodeAddress,
  searchAmenitiesByName,
} from "@/lib/amenities";

const bodySchema = z
  .object({
    /** Free-text place name — "Kaufland", a specific surgery. */
    query: z.string().trim().optional(),
    /** Or a category key, to list more nearby places of that kind. */
    category: z.string().trim().optional(),
  })
  .refine((v) => Boolean(v.query || v.category), {
    message: "Zadajte hľadaný výraz alebo kategóriu.",
  });

/**
 * Returns candidate places to add — either by name, or more of one category than the automatic
 * list keeps. Nothing is written here; the client adds what the technician picks through the normal
 * amenity-places endpoint, so a search never changes the report on its own.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);

    const inspection = await db.inspection.findUnique({
      where: { id },
      include: { property: true, amenityPlaces: true },
    });
    if (!inspection) throw new ApiError(404, "Obhliadka nebola nájdená");
    if (!inspection.amenitiesEnabled) {
      throw new ApiError(403, "Občianska vybavenosť je platená nadstavba — najprv ju zapnite.");
    }

    const { query, category } = bodySchema.parse(await req.json());

    // Reuse the stored coordinates; only geocode when we've never resolved this property.
    let origin =
      inspection.amenitiesLat != null && inspection.amenitiesLng != null
        ? { lat: inspection.amenitiesLat, lng: inspection.amenitiesLng }
        : null;

    if (!origin) {
      if (!inspection.property?.address?.trim()) {
        throw new ApiError(400, "Najprv zadajte adresu nehnuteľnosti v kroku Základné údaje.");
      }
      const geocoded = await geocodeAddress(buildGeocodeQuery(inspection.property));
      if (!geocoded) throw new ApiError(404, "Adresu nehnuteľnosti sa nepodarilo nájsť na mape.");
      origin = { lat: geocoded.lat, lng: geocoded.lng };
      await db.inspection.update({
        where: { id },
        data: { amenitiesLat: origin.lat, amenitiesLng: origin.lng, amenitiesLocationLabel: geocoded.label },
      });
    }

    if (category) {
      const existing = inspection.amenityPlaces.filter((p) => p.category === category).map((p) => p.name);
      const candidates = await fetchCategoryCandidates(origin, category, existing);
      return NextResponse.json({ candidates });
    }

    const found = await searchAmenitiesByName(origin, query!);
    return NextResponse.json({ candidates: found });
  } catch (error) {
    if (error instanceof AmenityLookupError) {
      return jsonError(new ApiError(502, error.message));
    }
    return jsonError(error);
  }
}
