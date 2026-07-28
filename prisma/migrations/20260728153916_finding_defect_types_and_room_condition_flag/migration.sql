-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "roomId" TEXT,
    "elementId" TEXT,
    "checklistKey" TEXT,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "defectTypes" TEXT NOT NULL DEFAULT '[]',
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
INSERT INTO "new_Finding" ("checklistKey", "createdAt", "description", "elementId", "id", "includeInSummary", "inspectionId", "isPositiveObservation", "label", "location", "order", "recommendedAction", "recommendedSpecialist", "roomId", "severity", "status", "updatedAt", "urgency") SELECT "checklistKey", "createdAt", "description", "elementId", "id", "includeInSummary", "inspectionId", "isPositiveObservation", "label", "location", "order", "recommendedAction", "recommendedSpecialist", "roomId", "severity", "status", "updatedAt", "urgency" FROM "Finding";
DROP TABLE "Finding";
ALTER TABLE "new_Finding" RENAME TO "Finding";
CREATE INDEX "Finding_inspectionId_idx" ON "Finding"("inspectionId");
CREATE INDEX "Finding_roomId_idx" ON "Finding"("roomId");
CREATE INDEX "Finding_elementId_idx" ON "Finding"("elementId");
CREATE TABLE "new_Room" (
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
    "generalConditionIsManual" BOOLEAN NOT NULL DEFAULT false,
    "accessibility" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Room" ("accessibility", "areaOverrideM2", "createdAt", "floorLevel", "generalCondition", "heightM", "id", "inspectionId", "lengthM", "name", "notes", "order", "type", "updatedAt", "widthM") SELECT "accessibility", "areaOverrideM2", "createdAt", "floorLevel", "generalCondition", "heightM", "id", "inspectionId", "lengthM", "name", "notes", "order", "type", "updatedAt", "widthM" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE INDEX "Room_inspectionId_idx" ON "Room"("inspectionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
