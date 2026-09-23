ALTER TABLE "Quotation" ADD COLUMN "clientFormTokenHash" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "clientFormExpiresAt" DATETIME;
ALTER TABLE "Quotation" ADD COLUMN "clientFormSentAt" DATETIME;
ALTER TABLE "Quotation" ADD COLUMN "clientFormSubmittedAt" DATETIME;

CREATE UNIQUE INDEX "Quotation_clientFormTokenHash_key" ON "Quotation"("clientFormTokenHash");
