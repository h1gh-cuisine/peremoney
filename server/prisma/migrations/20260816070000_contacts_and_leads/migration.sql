CREATE TYPE "LeadSaleStatus" AS ENUM ('UNPROCESSED', 'NEGOTIATION', 'NOT_TARGET', 'REFUSAL', 'BOUGHT');
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "Contact" (
  "id" UUID NOT NULL,
  "cabinetId" UUID NOT NULL,
  "providerAnswerId" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "mobileTel" TEXT NOT NULL,
  "site" TEXT,
  "mobileOperator" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" UUID NOT NULL,
  "cabinetId" UUID NOT NULL,
  "contactId" UUID NOT NULL,
  "successDate" TIMESTAMP(3) NOT NULL,
  "comment" TEXT,
  "feedback" TEXT NOT NULL DEFAULT '',
  "saleStatus" "LeadSaleStatus" NOT NULL DEFAULT 'UNPROCESSED',
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnswerSyncRun" (
  "id" UUID NOT NULL,
  "cabinetId" UUID NOT NULL,
  "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
  "receivedCount" INTEGER NOT NULL DEFAULT 0,
  "contactCount" INTEGER NOT NULL DEFAULT 0,
  "leadCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "AnswerSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contact_cabinetId_providerAnswerId_key" ON "Contact"("cabinetId", "providerAnswerId");
CREATE INDEX "Contact_cabinetId_date_idx" ON "Contact"("cabinetId", "date");
CREATE INDEX "Contact_cabinetId_status_idx" ON "Contact"("cabinetId", "status");
CREATE UNIQUE INDEX "Lead_contactId_key" ON "Lead"("contactId");
CREATE INDEX "Lead_cabinetId_successDate_idx" ON "Lead"("cabinetId", "successDate");
CREATE INDEX "Lead_cabinetId_saleStatus_idx" ON "Lead"("cabinetId", "saleStatus");
CREATE INDEX "AnswerSyncRun_cabinetId_startedAt_idx" ON "AnswerSyncRun"("cabinetId", "startedAt");
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerSyncRun" ADD CONSTRAINT "AnswerSyncRun_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
