import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { createClientFormToken, publicOrigin } from "@/lib/client-quotation-form";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const quote = await db.quotation.findFirst({ where: { id, organisationId: user.organisationId } });
    if (!quote) throw new ApiError(404, "Cenová ponuka nebola nájdená");
    if (["ACCEPTED", "CONVERTED"].includes(quote.status)) throw new ApiError(409, "Prijatú ponuku už nemožno poslať na doplnenie");
    z.string().trim().email("Zadajte platný e-mail klienta").parse(quote.clientEmail);

    const { token, hash } = createClientFormToken();
    const updated = await db.quotation.update({
      where: { id },
      data: {
        status: "AWAITING_SELECTION",
        clientFormTokenHash: hash,
        clientFormExpiresAt: addDays(new Date(), 14),
        clientFormSentAt: new Date(),
        clientFormSubmittedAt: null,
      },
    });
    const url = `${publicOrigin(req.headers, req.nextUrl.origin)}/ponuka/${token}`;
    return NextResponse.json({ url, status: updated.status, expiresAt: updated.clientFormExpiresAt });
  } catch (error) {
    return jsonError(error);
  }
}
