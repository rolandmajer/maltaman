import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { RESOURCE_MAP } from "@/lib/api-resources";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; resource: string }> }) {
  try {
    const user = await requireSession();
    const { id, resource } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const config = RESOURCE_MAP[resource];
    if (!config) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });

    const items = await config.delegate.findMany({
      where: { inspectionId: id },
      orderBy: config.orderBy,
    });
    return NextResponse.json(items);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; resource: string }> }) {
  try {
    const user = await requireSession();
    const { id, resource } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const config = RESOURCE_MAP[resource];
    if (!config) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });

    const body = await req.json();
    const data = config.createSchema.parse(body) as Record<string, unknown>;
    const created = await config.delegate.create({
      data: { ...data, inspectionId: id },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
