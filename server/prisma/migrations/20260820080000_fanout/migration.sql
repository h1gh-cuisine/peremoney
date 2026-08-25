CREATE TYPE "FanoutDeliveryStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

ALTER TABLE "Contact" ALTER COLUMN "providerAnswerId" DROP NOT NULL;

CREATE TABLE "FanoutSource" (
  "id" UUID NOT NULL, "publicId" TEXT NOT NULL, "name" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FanoutSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FanoutSource_publicId_key" ON "FanoutSource"("publicId");

CREATE TABLE "FanoutDestination" (
  "sourceId" UUID NOT NULL, "cabinetId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FanoutDestination_pkey" PRIMARY KEY ("sourceId", "cabinetId")
);
CREATE INDEX "FanoutDestination_cabinetId_idx" ON "FanoutDestination"("cabinetId");

CREATE TABLE "IncomingLead" (
  "id" UUID NOT NULL, "sourceId" UUID NOT NULL, "externalId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL, "mobileTel" TEXT NOT NULL, "name" TEXT,
  "site" TEXT, "mobileOperator" TEXT, "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncomingLead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IncomingLead_sourceId_externalId_key" ON "IncomingLead"("sourceId", "externalId");
CREATE INDEX "IncomingLead_sourceId_createdAt_idx" ON "IncomingLead"("sourceId", "createdAt");

CREATE TABLE "FanoutDelivery" (
  "id" UUID NOT NULL, "incomingLeadId" UUID NOT NULL, "cabinetId" UUID NOT NULL,
  "status" "FanoutDeliveryStatus" NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT, "contactId" UUID, "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FanoutDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FanoutDelivery_contactId_key" ON "FanoutDelivery"("contactId");
CREATE UNIQUE INDEX "FanoutDelivery_incomingLeadId_cabinetId_key" ON "FanoutDelivery"("incomingLeadId", "cabinetId");
CREATE INDEX "FanoutDelivery_cabinetId_status_idx" ON "FanoutDelivery"("cabinetId", "status");

ALTER TABLE "FanoutDestination" ADD CONSTRAINT "FanoutDestination_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FanoutSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FanoutDestination" ADD CONSTRAINT "FanoutDestination_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncomingLead" ADD CONSTRAINT "IncomingLead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FanoutSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FanoutDelivery" ADD CONSTRAINT "FanoutDelivery_incomingLeadId_fkey" FOREIGN KEY ("incomingLeadId") REFERENCES "IncomingLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FanoutDelivery" ADD CONSTRAINT "FanoutDelivery_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FanoutDelivery" ADD CONSTRAINT "FanoutDelivery_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
