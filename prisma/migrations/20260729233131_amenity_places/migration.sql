-- CreateTable
CREATE TABLE "AmenityPlace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "walkMinutes" INTEGER,
    "driveMinutes" INTEGER,
    "lat" REAL,
    "lng" REAL,
    "note" TEXT NOT NULL DEFAULT '',
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "includeInReport" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AmenityPlace_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "protocolNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "inspectionDate" DATETIME,
    "startTime" TEXT,
    "endTime" TEXT,
    "propertyType" TEXT,
    "purpose" TEXT,
    "generalNote" TEXT NOT NULL DEFAULT '',
    "overallConditionRating" TEXT,
    "mainRisks" TEXT NOT NULL DEFAULT '',
    "immediateActions" TEXT NOT NULL DEFAULT '',
    "followUpInspections" TEXT NOT NULL DEFAULT '',
    "overallVerdict" TEXT,
    "recommendedDiscountAmount" REAL,
    "verdictJustification" TEXT NOT NULL DEFAULT '',
    "contingencyPercent" REAL NOT NULL DEFAULT 0,
    "costsIncludeVat" BOOLEAN NOT NULL DEFAULT true,
    "costsEnteredInclVat" BOOLEAN NOT NULL DEFAULT false,
    "amenitiesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "amenitiesGeneratedAt" DATETIME,
    "amenitiesLat" REAL,
    "amenitiesLng" REAL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "parentInspectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Inspection_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_parentInspectionId_fkey" FOREIGN KEY ("parentInspectionId") REFERENCES "Inspection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Inspection" ("completedAt", "contingencyPercent", "costsEnteredInclVat", "costsIncludeVat", "createdAt", "createdById", "endTime", "followUpInspections", "generalNote", "id", "immediateActions", "inspectionDate", "mainRisks", "organisationId", "overallConditionRating", "overallVerdict", "parentInspectionId", "propertyType", "protocolNumber", "purpose", "recommendedDiscountAmount", "revisionNumber", "startTime", "status", "updatedAt", "verdictJustification") SELECT "completedAt", "contingencyPercent", "costsEnteredInclVat", "costsIncludeVat", "createdAt", "createdById", "endTime", "followUpInspections", "generalNote", "id", "immediateActions", "inspectionDate", "mainRisks", "organisationId", "overallConditionRating", "overallVerdict", "parentInspectionId", "propertyType", "protocolNumber", "purpose", "recommendedDiscountAmount", "revisionNumber", "startTime", "status", "updatedAt", "verdictJustification" FROM "Inspection";
DROP TABLE "Inspection";
ALTER TABLE "new_Inspection" RENAME TO "Inspection";
CREATE INDEX "Inspection_organisationId_status_idx" ON "Inspection"("organisationId", "status");
CREATE UNIQUE INDEX "Inspection_organisationId_protocolNumber_key" ON "Inspection"("organisationId", "protocolNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AmenityPlace_inspectionId_idx" ON "AmenityPlace"("inspectionId");

-- CreateIndex
CREATE INDEX "AmenityPlace_inspectionId_category_idx" ON "AmenityPlace"("inspectionId", "category");
