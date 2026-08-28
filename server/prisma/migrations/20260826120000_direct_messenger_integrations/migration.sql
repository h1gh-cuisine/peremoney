CREATE TABLE "DirectIntegration" (
  "id" UUID NOT NULL,
  "cabinetId" UUID NOT NULL,
  "channel" TEXT NOT NULL,
  "botTokenEncrypted" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DirectIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DirectIntegration_cabinetId_channel_key" ON "DirectIntegration"("cabinetId", "channel");
CREATE INDEX "DirectIntegration_cabinetId_idx" ON "DirectIntegration"("cabinetId");
ALTER TABLE "DirectIntegration" ADD CONSTRAINT "DirectIntegration_cabinetId_fkey"
  FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
