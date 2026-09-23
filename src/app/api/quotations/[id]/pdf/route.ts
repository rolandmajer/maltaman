import { NextRequest, NextResponse } from "next/server";
import { requireQuotationAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { renderQuotationPdf } from "@/lib/pdf/render-quotation";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    const quotation = await requireQuotationAccess(id, user.organisationId);
    const buffer = await renderQuotationPdf(id);
    const download = req.nextUrl.searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${quotation.quoteNumber}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return jsonError(error); }
}
