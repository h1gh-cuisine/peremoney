ALTER TABLE "Payment"
  ADD COLUMN "payerInn" TEXT,
  ADD COLUMN "tochkaDocumentId" TEXT,
  ADD COLUMN "bankPaymentId" TEXT;

CREATE UNIQUE INDEX "Payment_tochkaDocumentId_key" ON "Payment"("tochkaDocumentId");
CREATE UNIQUE INDEX "Payment_bankPaymentId_key" ON "Payment"("bankPaymentId");

CREATE TABLE "TochkaWebhookEvent" (
  "id" UUID NOT NULL,
  "externalId" TEXT NOT NULL,
  "webhookType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "paymentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TochkaWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TochkaWebhookEvent_externalId_key" ON "TochkaWebhookEvent"("externalId");
CREATE INDEX "TochkaWebhookEvent_status_createdAt_idx" ON "TochkaWebhookEvent"("status", "createdAt");
ALTER TABLE "TochkaWebhookEvent" ADD CONSTRAINT "TochkaWebhookEvent_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
