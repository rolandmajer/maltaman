import { geocodeAddress } from "@/lib/amenities";

export class RouteDistanceError extends Error {}

/** Returns road distance for one direction. The UI doubles it before applying the return bands. */
export async function roadDistance(originAddress: string, destinationAddress: string) {
  const [origin, destination] = await Promise.all([geocodeAddress(originAddress), geocodeAddress(destinationAddress)]);
  if (!origin) throw new RouteDistanceError("Východiskovú adresu sa nepodarilo nájsť.");
  if (!destination) throw new RouteDistanceError("Adresu nehnuteľnosti sa nepodarilo nájsť.");
  const base = process.env.ROUTING_BASE_URL || "https://router.project-osrm.org";
  const url = `${base.replace(/\/$/, "")}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&alternatives=false&steps=false`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "MALTAMAN/1.0" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new RouteDistanceError(`Výpočet trasy zlyhal (HTTP ${response.status}).`);
    const data = await response.json() as { routes?: Array<{ distance?: number; duration?: number }> };
    const route = data.routes?.[0];
    if (!route?.distance) throw new RouteDistanceError("Pre zadané adresy sa nenašla trasa.");
    return {
      oneWayDistanceKm: Math.round(route.distance / 100) / 10,
      durationMinutes: route.duration ? Math.round(route.duration / 60) : null,
      originLabel: origin.label,
      destinationLabel: destination.label,
    };
  } catch (error) {
    if (error instanceof RouteDistanceError) throw error;
    throw new RouteDistanceError("Výpočet trasy momentálne nie je dostupný. Vzdialenosť môžete zadať ručne.");
  } finally {
    clearTimeout(timeout);
  }
}
