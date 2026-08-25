CREATE TABLE "PaymentAudit" (
  "id" UUID NOT NULL, "paymentId" UUID, "actorId" UUID, "action" TEXT NOT NULL,
  "before" JSONB, "after" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentAudit_paymentId_createdAt_idx" ON "PaymentAudit"("paymentId", "createdAt");
CREATE INDEX "PaymentAudit_actorId_createdAt_idx" ON "PaymentAudit"("actorId", "createdAt");
ALTER TABLE "PaymentAudit" ADD CONSTRAINT "PaymentAudit_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAudit" ADD CONSTRAINT "PaymentAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
