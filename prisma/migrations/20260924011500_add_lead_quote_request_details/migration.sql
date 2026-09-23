ALTER TABLE "Lead" ADD COLUMN "requestedService" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN "floorAreaM2" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN "requestedOptionalCodes" TEXT NOT NULL DEFAULT '[]';

UPDATE "AppSettings"
SET "apartmentMinimumPrice" = 169
WHERE "apartmentMinimumPrice" = 180;

UPDATE "AppSettings"
SET "houseMinimumPrice" = 279
WHERE "houseMinimumPrice" = 280;

UPDATE "AppSettings"
SET "shellMinimumPrice" = 199
WHERE "shellMinimumPrice" = 200;
