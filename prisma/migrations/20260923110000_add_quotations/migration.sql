-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'CP';
ALTER TABLE "AppSettings" ADD COLUMN "pricingBaseAddress" TEXT NOT NULL DEFAULT 'Martin, Slovensko';
ALTER TABLE "AppSettings" ADD COLUMN "quoteValidityDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "AppSettings" ADD COLUMN "apartmentRatePerM2" REAL NOT NULL DEFAULT 2.5;
ALTER TABLE "AppSettings" ADD COLUMN "apartmentMinimumPrice" REAL NOT NULL DEFAULT 180;
ALTER TABLE "AppSettings" ADD COLUMN "houseRatePerM2" REAL NOT NULL DEFAULT 3;
ALTER TABLE "AppSettings" ADD COLUMN "houseMinimumPrice" REAL NOT NULL DEFAULT 280;
ALTER TABLE "AppSettings" ADD COLUMN "otherRatePerM2" REAL NOT NULL DEFAULT 3;
ALTER TABLE "AppSettings" ADD COLUMN "otherMinimumPrice" REAL NOT NULL DEFAULT 250;
ALTER TABLE "AppSettings" ADD COLUMN "shellRatePerM2" REAL NOT NULL DEFAULT 2.25;
ALTER TABLE "AppSettings" ADD COLUMN "shellMinimumPrice" REAL NOT NULL DEFAULT 200;
ALTER TABLE "AppSettings" ADD COLUMN "fullProtocolRatePerM2" REAL NOT NULL DEFAULT 1.2;
ALTER TABLE "AppSettings" ADD COLUMN "fullProtocolMinimum" REAL NOT NULL DEFAULT 120;
ALTER TABLE "AppSettings" ADD COLUMN "travelFreeUpToKm" REAL NOT NULL DEFAULT 30;
ALTER TABLE "AppSettings" ADD COLUMN "travelBandTwoUpToKm" REAL NOT NULL DEFAULT 60;
ALTER TABLE "AppSettings" ADD COLUMN "travelBandTwoPrice" REAL NOT NULL DEFAULT 20;
ALTER TABLE "AppSettings" ADD COLUMN "travelBandThreeUpToKm" REAL NOT NULL DEFAULT 100;
ALTER TABLE "AppSettings" ADD COLUMN "travelBandThreePrice" REAL NOT NULL DEFAULT 40;
ALTER TABLE "AppSettings" ADD COLUMN "travelOverBandRatePerKm" REAL NOT NULL DEFAULT 0.4;
ALTER TABLE "AppSettings" ADD COLUMN "quoteOptionalServices" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "customerId" TEXT,
    "leadId" TEXT,
    "inspectionId" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME,
    "clientName" TEXT NOT NULL DEFAULT '',
    "clientEmail" TEXT NOT NULL DEFAULT '',
    "clientPhone" TEXT NOT NULL DEFAULT '',
    "propertyAddress" TEXT NOT NULL DEFAULT '',
    "propertyType" TEXT NOT NULL DEFAULT 'APARTMENT',
    "floorAreaM2" REAL NOT NULL DEFAULT 0,
    "floors" INTEGER NOT NULL DEFAULT 1,
    "baseRatePerM2" REAL NOT NULL DEFAULT 0,
    "minimumPrice" REAL NOT NULL DEFAULT 0,
    "furnishingLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "complexityFactors" TEXT NOT NULL DEFAULT '[]',
    "complexityPercent" REAL NOT NULL DEFAULT 0,
    "complexityDescription" TEXT NOT NULL DEFAULT '',
    "routeOrigin" TEXT NOT NULL DEFAULT '',
    "oneWayDistanceKm" REAL NOT NULL DEFAULT 0,
    "returnDistanceKm" REAL NOT NULL DEFAULT 0,
    "travelCharge" REAL NOT NULL DEFAULT 0,
    "distanceManual" BOOLEAN NOT NULL DEFAULT false,
    "routeNote" TEXT NOT NULL DEFAULT '',
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "vatRatePercent" REAL NOT NULL DEFAULT 23,
    "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT 'Cena vychádza z údajov poskytnutých pred obhliadkou. Pri podstatnej zmene rozsahu, výmery alebo prístupnosti bude zmena ceny vopred odsúhlasená klientom.',
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quotation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quotation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quotation_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'paušál',
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_inspectionId_key" ON "Quotation"("inspectionId");
CREATE UNIQUE INDEX "Quotation_organisationId_quoteNumber_key" ON "Quotation"("organisationId", "quoteNumber");
CREATE INDEX "Quotation_organisationId_status_idx" ON "Quotation"("organisationId", "status");
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");
CREATE INDEX "Quotation_leadId_idx" ON "Quotation"("leadId");
CREATE INDEX "QuotationLineItem_quotationId_kind_order_idx" ON "QuotationLineItem"("quotationId", "kind", "order");
