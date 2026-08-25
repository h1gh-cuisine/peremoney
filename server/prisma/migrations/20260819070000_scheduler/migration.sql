CREATE TYPE "SchedulePreset" AS ENUM ('WEEKDAYS', 'WEEKENDS', 'EVERYDAY');
CREATE TYPE "ScheduledTask" AS ENUM ('SOURCES_SYNC', 'CONTACTS_SYNC', 'TAG_AUTOMATION', 'APPLY_SCHEDULE', 'SCRIPT_SYNC');
CREATE TYPE "ScheduledRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

ALTER TABLE "Cabinet"
ADD COLUMN "schedulePreset" "SchedulePreset" NOT NULL DEFAULT 'EVERYDAY',
ADD COLUMN "operatorScript" TEXT,
ADD COLUMN "operatorScriptName" TEXT,
ADD COLUMN "operatorScriptLevel" INTEGER,
ADD COLUMN "scriptSyncedAt" TIMESTAMP(3);

CREATE TABLE "ScheduledRun" (
  "id" UUID NOT NULL,
  "cabinetId" UUID NOT NULL,
  "task" "ScheduledTask" NOT NULL,
  "status" "ScheduledRunStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduledRun_cabinetId_task_scheduledFor_key" ON "ScheduledRun"("cabinetId", "task", "scheduledFor");
CREATE INDEX "ScheduledRun_status_nextAttemptAt_idx" ON "ScheduledRun"("status", "nextAttemptAt");
CREATE INDEX "ScheduledRun_cabinetId_scheduledFor_idx" ON "ScheduledRun"("cabinetId", "scheduledFor");
ALTER TABLE "ScheduledRun" ADD CONSTRAINT "ScheduledRun_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
