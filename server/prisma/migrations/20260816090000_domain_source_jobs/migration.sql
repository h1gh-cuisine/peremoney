CREATE TYPE "DomainJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "DomainSourceJob" (
  "id" UUID NOT NULL,
  "cabinetId" UUID NOT NULL,
  "status" "DomainJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DomainSourceJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DomainSourceJob_status_scheduledAt_idx" ON "DomainSourceJob"("status", "scheduledAt");
CREATE INDEX "DomainSourceJob_cabinetId_createdAt_idx" ON "DomainSourceJob"("cabinetId", "createdAt");
ALTER TABLE "DomainSourceJob" ADD CONSTRAINT "DomainSourceJob_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
