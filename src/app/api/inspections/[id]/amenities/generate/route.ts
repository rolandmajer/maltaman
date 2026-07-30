import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { AmenityLookupError, buildGeocodeQuery, fetchAmenities, geocodeAddress } from "@/lib/amenities";

/**
 * Regenerates the amenities list from the property address.
 *
 * Rows the technician added by hand are kept — only generated ones are replaced, so re-running
 * after fixing the address never discards their own entries. Geocoding is skipped when we already
 * have coordinates unless `?regeocode=1` is passed, which keeps us off Nominatim on a plain retry.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);

    const inspection = await db.inspection.findUnique({ where: { id }, include: { property: true } });
    if (!inspection) throw new ApiError(404, "Obhliadka nebola nájdená");
    if (!inspection.amenitiesEnabled) {
      throw new ApiError(403, "Občianska vybavenosť je platená nadstavba — najprv ju zapnite.");
    }

    const regeocode = req.nextUrl.searchParams.get("regeocode") === "1";
    const hasCoords = inspection.amenitiesLat != null && inspection.amenitiesLng != null;

    let origin = hasCoords ? { lat: inspection.amenitiesLat!, lng: inspection.amenitiesLng! } : null;
    let label = inspection.amenitiesLocationLabel;

    if (!origin || regeocode) {
      const query = buildGeocodeQuery(inspection.property ?? {});
      if (!inspection.property?.address?.trim()) {
        throw new ApiError(400, "Najprv zadajte adresu nehnuteľnosti v kroku Základné údaje.");
      }
      const geocoded = await geocodeAddress(query);
      if (!geocoded) {
        throw new ApiError(404, `Adresu „${query}“ sa nepodarilo nájsť na mape. Skúste ju upraviť.`);
      }
      origin = { lat: geocoded.lat, lng: geocoded.lng };
      label = geocoded.label;
    }

    const candidates = await fetchAmenities(origin);

    const places = await db.$transaction(async (tx) => {
      await tx.amenityPlace.deleteMany({ where: { inspectionId: id, isManual: false } });
      if (candidates.length > 0) {
        await tx.amenityPlace.createMany({
          data: candidates.map((c, index) => ({
            inspectionId: id,
            category: c.category,
            name: c.name,
            distanceM: c.distanceM,
            walkMinutes: c.walkMinutes,
            driveMinutes: c.driveMinutes,
            lat: c.lat,
            lng: c.lng,
            order: index,
          })),
        });
      }
      await tx.inspection.update({
        where: { id },
        data: {
          amenitiesGeneratedAt: new Date(),
          amenitiesLat: origin!.lat,
          amenitiesLng: origin!.lng,
          amenitiesLocationLabel: label,
        },
      });
      return tx.amenityPlace.findMany({ where: { inspectionId: id }, orderBy: { distanceM: "asc" } });
    });

    return NextResponse.json({ places, locationLabel: label, generatedCount: candidates.length });
  } catch (error) {
    if (error instanceof AmenityLookupError) {
      return jsonError(new ApiError(502, error.message));
    }
    return jsonError(error);
  }
}
