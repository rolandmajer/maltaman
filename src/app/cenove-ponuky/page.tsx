import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { quotationTotals } from "@/lib/quotation-calculations";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Koncept", SENT: "Odoslaná", AWAITING_SELECTION: "Čaká na výber", CLIENT_SELECTED: "Klient vybral", ACCEPTED: "Prijatá", REJECTED: "Odmietnutá", EXPIRED: "Expirovaná", CONVERTED: "Vytvorená obhliadka",
};

export default async function QuotationsPage() {
  const session = await auth();
  const quotations = await db.quotation.findMany({
    where: { organisationId: session!.user.organisationId },
    orderBy: { updatedAt: "desc" },
    include: { lineItems: true, inspection: { select: { id: true, protocolNumber: true } } },
  });
  return (
    <>
      <AppHeader userName={session!.user.name ?? ""} />
      <main className="mx-auto max-w-5xl p-4 pb-24">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cenové ponuky</h1>
            <p className="text-sm text-slate-500">Cena obhliadky, cestovné a služby, ktoré si klient vyberie samostatne.</p>
          </div>
          <Link href="/cenove-ponuky/nova" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800 active:bg-brand-900"><Plus className="size-4" /> Nová cenová ponuka</Link>
        </div>
        <div className="grid gap-3">
          {quotations.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Zatiaľ nemáte žiadnu cenovú ponuku.</div>}
          {quotations.map((quote) => {
            const totals = quotationTotals(quote.lineItems, quote.discountAmount, quote.vatRatePercent, quote.pricesIncludeVat);
            return (
              <Link key={quote.id} href={`/cenove-ponuky/${quote.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{quote.quoteNumber}</p><Badge variant="secondary">{STATUS_LABELS[quote.status] ?? quote.status}</Badge></div>
                    <p className="mt-1 truncate text-sm text-slate-700">{quote.clientName || "Klient nezadaný"} · {quote.propertyAddress || "Adresa nezadaná"}</p>
                    <p className="mt-1 text-xs text-slate-500">{quote.floorAreaM2} m² · vystavená {formatDate(quote.issuedAt)}</p>
                  </div>
                  <div className="text-right"><p className="text-lg font-bold text-slate-900">{formatCurrency(totals.priceInclVat)}</p><p className="text-xs text-slate-500">podľa vybraných služieb</p></div>
                </div>
                {quote.inspection && <p className="mt-3 flex items-center gap-1 text-xs text-emerald-700"><FileText className="size-3.5" /> {quote.inspection.protocolNumber}</p>}
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
