import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { RESOURCE_MAP } from "@/lib/api-resources";

async function loadScopedItem(
  config: (typeof RESOURCE_MAP)[string],
  itemId: string,
  inspectionId: string
) {
  const item = (await config.delegate.findUnique({ where: { id: itemId } })) as {
    inspectionId?: string;
  } | null;
  if (!item || item.inspectionId !== inspectionId) {
    throw new ApiError(404, "Záznam nebol nájdený");
  }
  return item;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; resource: string; itemId: string }> }
) {
  try {
    const user = await requireSession();
    const { id, resource, itemId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const config = RESOURCE_MAP[resource];
    if (!config) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });

    await loadScopedItem(config, itemId, id);
    const body = await req.json();
    const data = config.updateSchema.parse(body);
    const updated = await config.delegate.update({ where: { id: itemId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; resource: string; itemId: string }> }
) {
  try {
    const user = await requireSession();
    const { id, resource, itemId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const config = RESOURCE_MAP[resource];
    if (!config) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });

    await loadScopedItem(config, itemId, id);
    await config.delegate.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
