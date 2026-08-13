-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "emailNormalized" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "consentAt" DATETIME,
    "consentSource" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add the optional customer relation without rebuilding Inspection. This preserves
-- columns and data introduced by every earlier inspection migration in production.
ALTER TABLE "Inspection" ADD COLUMN "customerId" TEXT
    REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "propertyAddress" TEXT NOT NULL DEFAULT '',
    "propertyType" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "nextActionAt" DATETIME,
    "externalId" TEXT,
    "inspectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organisationId_emailNormalized_key" ON "Customer"("organisationId", "emailNormalized");
CREATE INDEX "Customer_organisationId_name_idx" ON "Customer"("organisationId", "name");
CREATE INDEX "Inspection_customerId_idx" ON "Inspection"("customerId");
CREATE UNIQUE INDEX "Lead_inspectionId_key" ON "Lead"("inspectionId");
CREATE UNIQUE INDEX "Lead_organisationId_externalId_key" ON "Lead"("organisationId", "externalId");
CREATE INDEX "Lead_organisationId_status_idx" ON "Lead"("organisationId", "status");
CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");
