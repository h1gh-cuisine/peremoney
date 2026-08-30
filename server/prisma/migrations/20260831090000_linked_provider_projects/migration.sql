ALTER TABLE "Cabinet"
ADD COLUMN "linkedProviderProjectIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "Contact"
ADD COLUMN "providerProjectId" INTEGER;

-- Every existing Contact came from the cabinet's own (single, pre-this-feature)
-- provider project — backfill it so the new composite unique key does not treat
-- pre-existing rows as unscoped duplicates. Fan-out-delivered contacts have
-- providerAnswerId IS NULL and are intentionally left with providerProjectId NULL.
UPDATE "Contact" c
SET "providerProjectId" = cab."providerProjectId"
FROM "Cabinet" cab
WHERE cab.id = c."cabinetId" AND c."providerAnswerId" IS NOT NULL;

DROP INDEX "Contact_cabinetId_providerAnswerId_key";
CREATE UNIQUE INDEX "Contact_cabinetId_providerProjectId_providerAnswerId_key"
  ON "Contact"("cabinetId", "providerProjectId", "providerAnswerId");

ALTER TABLE "AnswerSyncRun"
ADD COLUMN "providerProjectId" INTEGER;

DROP INDEX "AnswerSyncRun_cabinetId_startedAt_idx";
CREATE INDEX "AnswerSyncRun_cabinetId_providerProjectId_startedAt_idx"
  ON "AnswerSyncRun"("cabinetId", "providerProjectId", "startedAt");
