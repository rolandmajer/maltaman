-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TECHNICIAN',
    "registrationNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'MALTAMAN',
    "companyTagline" TEXT NOT NULL DEFAULT 'Nezávislé stavebné poradenstvo',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyIco" TEXT NOT NULL DEFAULT '',
    "companyDic" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyWeb" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "protocolNumberPrefix" TEXT NOT NULL DEFAULT 'PZ',
    "defaultVatRatePercent" REAL NOT NULL DEFAULT 23,
    "defaultContingencyPercent" REAL NOT NULL DEFAULT 10,
    "gpsCaptureEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dataRetentionMonths" INTEGER DEFAULT 60,
    "legalVisualNonDestructive" TEXT NOT NULL DEFAULT 'Obhliadka bola vykonaná vizuálne a nedeštruktívne, v rozsahu prístupných častí nehnuteľnosti ku dňu obhliadky.',
    "legalNotAReplacement" TEXT NOT NULL DEFAULT 'Protokol nenahrádza statický posudok, revíznu správu ani znalecký posudok v zmysle osobitných predpisov.',
    "legalHiddenDefects" TEXT NOT NULL DEFAULT 'Skryté vady, ktoré nebolo možné zistiť vizuálnou obhliadkou (napr. pod podlahami, v konštrukciách, v zakrytých rozvodoch), nie sú predmetom tohto protokolu.',
    "legalLimitedByAccess" TEXT NOT NULL DEFAULT 'Závery sú obmedzené rozsahom prístupu a podmienkami v čase obhliadky.',
    "legalCostsIndicative" TEXT NOT NULL DEFAULT 'Odhady nákladov sú orientačné, v cenovej úrovni ku dňu obhliadky, a slúžia ako podklad pre rozhodovanie a vyjednávanie klienta.',
    "legalClientOnly" TEXT NOT NULL DEFAULT 'Protokol je určený výhradne pre objednávateľa a nesmie byť bez súhlasu poradcu poskytnutý tretím stranám na komerčné účely.',
    "updatedAt" DATETIME NOT NULL,
    "costCategoryPresets" TEXT NOT NULL DEFAULT '[]',
    "roomTypePresets" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "AppSettings_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
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
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "parentInspectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Inspection_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_parentInspectionId_fkey" FOREIGN KEY ("parentInspectionId") REFERENCES "Inspection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "apartmentNumber" TEXT NOT NULL DEFAULT '',
    "floor" TEXT NOT NULL DEFAULT '',
    "municipality" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "cadastralArea" TEXT NOT NULL DEFAULT '',
    "parcelNumber" TEXT NOT NULL DEFAULT '',
    "landRegistryNumber" TEXT NOT NULL DEFAULT '',
    "constructionYear" INTEGER,
    "lastRenovationYear" INTEGER,
    "totalFloorAreaM2" REAL,
    "occupancyStatus" TEXT NOT NULL DEFAULT '',
    "administratorName" TEXT NOT NULL DEFAULT '',
    "ownerName" TEXT NOT NULL DEFAULT '',
    "ownerContact" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Property_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionConditions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "weather" TEXT NOT NULL DEFAULT '',
    "outdoorTemperatureC" REAL,
    "occupancy" TEXT NOT NULL DEFAULT '',
    "accessibility" TEXT NOT NULL DEFAULT '',
    "lighting" TEXT NOT NULL DEFAULT '',
    "equipmentCondition" TEXT NOT NULL DEFAULT '',
    "limitations" TEXT NOT NULL DEFAULT '',
    "measuringDevices" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "InspectionConditions_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "organisation" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "presentFrom" TEXT NOT NULL DEFAULT '',
    "presentTo" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "floorLevel" TEXT NOT NULL DEFAULT '',
    "lengthM" REAL,
    "widthM" REAL,
    "heightM" REAL,
    "areaOverrideM2" REAL,
    "generalCondition" TEXT NOT NULL DEFAULT '',
    "accessibility" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionCategory_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionElement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InspectionCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "roomId" TEXT,
    "elementId" TEXT,
    "checklistKey" TEXT,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "description" TEXT NOT NULL DEFAULT '',
    "severity" TEXT,
    "location" TEXT NOT NULL DEFAULT '',
    "recommendedAction" TEXT NOT NULL DEFAULT '',
    "recommendedSpecialist" TEXT NOT NULL DEFAULT '',
    "urgency" TEXT,
    "isPositiveObservation" BOOLEAN NOT NULL DEFAULT false,
    "includeInSummary" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Finding_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Finding_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Finding_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "InspectionElement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "findingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Measurement_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "roomId" TEXT,
    "findingId" TEXT,
    "elementId" TEXT,
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
    CONSTRAINT "Photo_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "InspectionElement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostCategory_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "roomId" TEXT,
    "findingId" TEXT,
    "elementId" TEXT,
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
    CONSTRAINT "CostItem_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "InspectionElement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "relatedRoomId" TEXT,
    "relatedFindingId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_relatedRoomId_fkey" FOREIGN KEY ("relatedRoomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_relatedFindingId_fkey" FOREIGN KEY ("relatedFindingId") REFERENCES "Finding" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "organisationName" TEXT NOT NULL DEFAULT '',
    "registrationNumber" TEXT NOT NULL DEFAULT '',
    "place" TEXT NOT NULL DEFAULT '',
    "signedAt" DATETIME,
    "imageDataUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportRevision_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_organisationId_key" ON "AppSettings"("organisationId");

-- CreateIndex
CREATE INDEX "Inspection_organisationId_status_idx" ON "Inspection"("organisationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_organisationId_protocolNumber_key" ON "Inspection"("organisationId", "protocolNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Property_inspectionId_key" ON "Property"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionConditions_inspectionId_key" ON "InspectionConditions"("inspectionId");

-- CreateIndex
CREATE INDEX "Participant_inspectionId_idx" ON "Participant"("inspectionId");

-- CreateIndex
CREATE INDEX "Room_inspectionId_idx" ON "Room"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionCategory_inspectionId_idx" ON "InspectionCategory"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionElement_categoryId_idx" ON "InspectionElement"("categoryId");

-- CreateIndex
CREATE INDEX "Finding_inspectionId_idx" ON "Finding"("inspectionId");

-- CreateIndex
CREATE INDEX "Finding_roomId_idx" ON "Finding"("roomId");

-- CreateIndex
CREATE INDEX "Finding_elementId_idx" ON "Finding"("elementId");

-- CreateIndex
CREATE INDEX "Measurement_findingId_idx" ON "Measurement"("findingId");

-- CreateIndex
CREATE INDEX "Photo_inspectionId_idx" ON "Photo"("inspectionId");

-- CreateIndex
CREATE INDEX "Photo_roomId_idx" ON "Photo"("roomId");

-- CreateIndex
CREATE INDEX "Photo_findingId_idx" ON "Photo"("findingId");

-- CreateIndex
CREATE INDEX "Photo_elementId_idx" ON "Photo"("elementId");

-- CreateIndex
CREATE INDEX "CostCategory_inspectionId_idx" ON "CostCategory"("inspectionId");

-- CreateIndex
CREATE INDEX "CostItem_inspectionId_idx" ON "CostItem"("inspectionId");

-- CreateIndex
CREATE INDEX "CostItem_categoryId_idx" ON "CostItem"("categoryId");

-- CreateIndex
CREATE INDEX "CostItem_roomId_idx" ON "CostItem"("roomId");

-- CreateIndex
CREATE INDEX "CostItem_findingId_idx" ON "CostItem"("findingId");

-- CreateIndex
CREATE INDEX "CostItem_elementId_idx" ON "CostItem"("elementId");

-- CreateIndex
CREATE INDEX "Recommendation_inspectionId_idx" ON "Recommendation"("inspectionId");

-- CreateIndex
CREATE INDEX "Signature_inspectionId_idx" ON "Signature"("inspectionId");

-- CreateIndex
CREATE INDEX "ReportRevision_inspectionId_idx" ON "ReportRevision"("inspectionId");
