-- CreateTable
CREATE TABLE "RoomElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "elementKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "naReason" TEXT,
    "naReasonNote" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionIsManual" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomElement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElementAttribute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomElementId" TEXT NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "ElementAttribute_roomElementId_fkey" FOREIGN KEY ("roomElementId") REFERENCES "RoomElement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElementCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomElementId" TEXT NOT NULL,
    "defectTypes" TEXT NOT NULL DEFAULT '[]',
    "location" TEXT NOT NULL DEFAULT '',
    "extent" TEXT NOT NULL DEFAULT '',
    "severity" TEXT,
    "cause" TEXT NOT NULL DEFAULT '',
    "recommendedAction" TEXT NOT NULL DEFAULT '',
    "deadline" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "includeInSummary" BOOLEAN NOT NULL DEFAULT true,
    "excludeFromReport" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ElementCondition_roomElementId_fkey" FOREIGN KEY ("roomElementId") REFERENCES "RoomElement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomPresetValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomPresetValue_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CostItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "roomId" TEXT,
    "findingId" TEXT,
    "elementId" TEXT,
    "roomElementId" TEXT,
    "elementConditionId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'KS',
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "laborCost" REAL NOT NULL DEFAULT 0,
    "materialCost" REAL NOT NULL DEFAULT 0,
    "otherCost" REAL NOT NULL DEFAULT 0,
    "vatRatePercent" REAL NOT NULL DEFAULT 23,
    "minEstimate" REAL,
    "expectedEstimate" REAL,
    "maxEstimate" REAL,
    "priority" TEXT NOT NULL DEFAULT 'OPTIONAL',
    "completionHorizon" TEXT NOT NULL DEFAULT '',
    "supplier" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "included" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CostItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CostCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CostItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostItem_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostItem_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "InspectionElement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostItem_roomElementId_fkey" FOREIGN KEY ("roomElementId") REFERENCES "RoomElement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostItem_elementConditionId_fkey" FOREIGN KEY ("elementConditionId") REFERENCES "ElementCondition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CostItem" ("categoryId", "completionHorizon", "createdAt", "description", "elementId", "expectedEstimate", "findingId", "id", "included", "inspectionId", "laborCost", "materialCost", "maxEstimate", "minEstimate", "name", "notes", "order", "otherCost", "priority", "quantity", "roomId", "source", "supplier", "unit", "unitPrice", "updatedAt", "vatRatePercent") SELECT "categoryId", "completionHorizon", "createdAt", "description", "elementId", "expectedEstimate", "findingId", "id", "included", "inspectionId", "laborCost", "materialCost", "maxEstimate", "minEstimate", "name", "notes", "order", "otherCost", "priority", "quantity", "roomId", "source", "supplier", "unit", "unitPrice", "updatedAt", "vatRatePercent" FROM "CostItem";
DROP TABLE "CostItem";
ALTER TABLE "new_CostItem" RENAME TO "CostItem";
CREATE INDEX "CostItem_inspectionId_idx" ON "CostItem"("inspectionId");
CREATE INDEX "CostItem_categoryId_idx" ON "CostItem"("categoryId");
CREATE INDEX "CostItem_roomId_idx" ON "CostItem"("roomId");
CREATE INDEX "CostItem_findingId_idx" ON "CostItem"("findingId");
CREATE INDEX "CostItem_elementId_idx" ON "CostItem"("elementId");
CREATE INDEX "CostItem_roomElementId_idx" ON "CostItem"("roomElementId");
CREATE INDEX "CostItem_elementConditionId_idx" ON "CostItem"("elementConditionId");
CREATE TABLE "new_Measurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "findingId" TEXT,
    "elementConditionId" TEXT,
    "label" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Measurement_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Measurement_elementConditionId_fkey" FOREIGN KEY ("elementConditionId") REFERENCES "ElementCondition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Measurement" ("findingId", "id", "label", "note", "order", "unit", "value") SELECT "findingId", "id", "label", "note", "order", "unit", "value" FROM "Measurement";
DROP TABLE "Measurement";
ALTER TABLE "new_Measurement" RENAME TO "Measurement";
CREATE INDEX "Measurement_findingId_idx" ON "Measurement"("findingId");
CREATE INDEX "Measurement_elementConditionId_idx" ON "Measurement"("elementConditionId");
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "roomId" TEXT,
    "findingId" TEXT,
    "elementId" TEXT,
    "roomElementId" TEXT,
    "elementConditionId" TEXT,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "rotationDegrees" INTEGER NOT NULL DEFAULT 0,
    "annotationsJson" TEXT NOT NULL DEFAULT '[]',
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "excludeFromReport" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" DATETIME,
    "gpsLat" REAL,
    "gpsLng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "InspectionElement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_roomElementId_fkey" FOREIGN KEY ("roomElementId") REFERENCES "RoomElement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_elementConditionId_fkey" FOREIGN KEY ("elementConditionId") REFERENCES "ElementCondition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("annotationsJson", "caption", "capturedAt", "createdAt", "elementId", "excludeFromReport", "findingId", "gpsLat", "gpsLng", "id", "inspectionId", "isCover", "order", "roomId", "rotationDegrees", "storageKey", "thumbnailKey") SELECT "annotationsJson", "caption", "capturedAt", "createdAt", "elementId", "excludeFromReport", "findingId", "gpsLat", "gpsLng", "id", "inspectionId", "isCover", "order", "roomId", "rotationDegrees", "storageKey", "thumbnailKey" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_inspectionId_idx" ON "Photo"("inspectionId");
CREATE INDEX "Photo_roomId_idx" ON "Photo"("roomId");
CREATE INDEX "Photo_findingId_idx" ON "Photo"("findingId");
CREATE INDEX "Photo_elementId_idx" ON "Photo"("elementId");
CREATE INDEX "Photo_roomElementId_idx" ON "Photo"("roomElementId");
CREATE INDEX "Photo_elementConditionId_idx" ON "Photo"("elementConditionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RoomElement_roomId_idx" ON "RoomElement"("roomId");

-- CreateIndex
CREATE INDEX "RoomElement_roomId_elementKey_idx" ON "RoomElement"("roomId", "elementKey");

-- CreateIndex
CREATE INDEX "ElementAttribute_roomElementId_idx" ON "ElementAttribute"("roomElementId");

-- CreateIndex
CREATE UNIQUE INDEX "ElementAttribute_roomElementId_attributeKey_key" ON "ElementAttribute"("roomElementId", "attributeKey");

-- CreateIndex
CREATE INDEX "ElementCondition_roomElementId_idx" ON "ElementCondition"("roomElementId");

-- CreateIndex
CREATE INDEX "CustomPresetValue_organisationId_category_lastUsedAt_idx" ON "CustomPresetValue"("organisationId", "category", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPresetValue_organisationId_category_value_key" ON "CustomPresetValue"("organisationId", "category", "value");
