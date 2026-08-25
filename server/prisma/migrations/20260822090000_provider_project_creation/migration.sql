CREATE TYPE "ProviderProjectCreationStatus" AS ENUM ('PENDING', 'EXTERNAL_CREATED', 'SUCCEEDED', 'UNCERTAIN', 'FAILED');

CREATE TABLE "ProviderProjectCreation" (
  "id" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" "ProviderProjectCreationStatus" NOT NULL DEFAULT 'PENDING',
  "providerProjectId" INTEGER,
  "cabinetId" UUID,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderProjectCreation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderProjectCreation_idempotencyKey_key" ON "ProviderProjectCreation"("idempotencyKey");
CREATE UNIQUE INDEX "ProviderProjectCreation_cabinetId_key" ON "ProviderProjectCreation"("cabinetId");
ALTER TABLE "ProviderProjectCreation" ADD CONSTRAINT "ProviderProjectCreation_cabinetId_fkey"
  FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
