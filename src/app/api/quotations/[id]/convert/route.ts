import { NextResponse } from "next/server";
import { requireQuotationAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { convertQuotationToInspection } from "@/lib/quotation-service";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireQuotationAccess(id, user.organisationId);
    const inspection = await convertQuotationToInspection(id, user.organisationId, user.id);
    return NextResponse.json(inspection);
  } catch (error) {
    return jsonError(error);
  }
}
