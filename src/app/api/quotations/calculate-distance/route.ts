import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roadDistance, RouteDistanceError } from "@/lib/route-distance";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const { destination } = z.object({ destination: z.string().trim().min(3) }).parse(await req.json());
    const settings = await db.appSettings.findUniqueOrThrow({ where: { organisationId: user.organisationId } });
    const result = await roadDistance(settings.pricingBaseAddress, destination);
    return NextResponse.json({ ...result, returnDistanceKm: Math.round(result.oneWayDistanceKm * 20) / 10 });
  } catch (error) {
    if (error instanceof RouteDistanceError) return jsonError(new ApiError(422, error.message));
    return jsonError(error);
  }
}
