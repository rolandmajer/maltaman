import { NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api-helpers";
import { convertLeadToInspection } from "@/lib/crm";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const result = await convertLeadToInspection({
      leadId: id,
      organisationId: user.organisationId,
      createdById: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
