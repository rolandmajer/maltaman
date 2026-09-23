import { NextRequest, NextResponse } from "next/server";
import { ApiError, jsonError, requireSession } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const customer = await db.customer.findFirst({
      where: { id, organisationId: user.organisationId },
      select: { id: true },
    });
    if (!customer) throw new ApiError(404, "Klient nebol nájdený");

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
