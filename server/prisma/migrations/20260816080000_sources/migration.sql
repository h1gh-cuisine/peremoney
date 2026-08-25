ALTER TABLE "Cabinet"
ADD COLUMN "autoCleanupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoManagementEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "minContactsPerLead" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "minConversion" DECIMAL(7,4) NOT NULL DEFAULT 0;

CREATE TABLE "SourceTag" (
  "id" UUID NOT NULL,
  "cabinetId" UUID NOT NULL,
  "providerTagId" INTEGER NOT NULL,
  "rawName" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "operator" TEXT,
  "sourceType" TEXT,
  "newAnswer" INTEGER NOT NULL DEFAULT 0,
  "success" INTEGER NOT NULL DEFAULT 0,
  "conversion" DECIMAL(9,4) NOT NULL DEFAULT 0,
  "sebes" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "normWork" BOOLEAN NOT NULL DEFAULT false,
  "limit" INTEGER NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceTag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SourceTag_cabinetId_providerTagId_key" ON "SourceTag"("cabinetId", "providerTagId");
CREATE INDEX "SourceTag_cabinetId_name_idx" ON "SourceTag"("cabinetId", "name");
CREATE INDEX "SourceTag_cabinetId_normWork_idx" ON "SourceTag"("cabinetId", "normWork");
ALTER TABLE "SourceTag" ADD CONSTRAINT "SourceTag_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
