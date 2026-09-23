import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { readPhotoFile } from "@/lib/storage";
import { ensureFontsRegistered } from "@/lib/pdf/fonts";
import { QuotationDocument } from "@/lib/pdf/quotation-document";

const renders = new Map<string, Promise<Buffer>>();

export function renderQuotationPdf(quotationId: string) {
  const existing = renders.get(quotationId);
  if (existing) return existing;
  const started = renderUncached(quotationId).finally(() => renders.delete(quotationId));
  renders.set(quotationId, started);
  return started;
}

async function renderUncached(quotationId: string) {
  ensureFontsRegistered();
  const quote = await db.quotation.findUnique({ where: { id: quotationId }, include: { lineItems: { orderBy: { order: "asc" } } } });
  if (!quote) throw new Error("Cenová ponuka nebola nájdená");
  const settings = await db.appSettings.findUniqueOrThrow({ where: { organisationId: quote.organisationId } });
  let logoBuffer: Buffer | undefined;
  try { logoBuffer = settings.logoUrl ? await readPhotoFile(settings.logoUrl) : await readFile(path.join(process.cwd(), "public/logo.png")); } catch { logoBuffer = undefined; }
  const element = React.createElement(QuotationDocument, { quote, settings, logoBuffer });
  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
}
