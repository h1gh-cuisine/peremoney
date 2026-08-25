CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');
CREATE TYPE "BalanceEntryType" AS ENUM ('PAYMENT', 'CONTACT_CHARGE', 'LEAD_CHARGE', 'PAYMENT_REVERSAL');

ALTER TABLE "Cabinet"
ADD COLUMN "managerName" TEXT,
ADD COLUMN "sphere" TEXT,
ADD COLUMN "moneyBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "totalUnits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "usedUnits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "balanceType" "ProjectType";

CREATE TABLE "PayerProfile" (
  "id" UUID NOT NULL, "cabinetId" UUID NOT NULL, "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayerProfile_cabinetId_key" ON "PayerProfile"("cabinetId");
ALTER TABLE "PayerProfile" ADD CONSTRAINT "PayerProfile_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Payment" (
  "id" UUID NOT NULL, "cabinetId" UUID NOT NULL, "invoiceNo" TEXT NOT NULL,
  "legalEntity" TEXT, "quantity" INTEGER NOT NULL, "unitPrice" DECIMAL(14,2) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL, "projectType" "ProjectType" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING', "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_invoiceNo_key" ON "Payment"("invoiceNo");
CREATE INDEX "Payment_cabinetId_status_createdAt_idx" ON "Payment"("cabinetId", "status", "createdAt");
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BalanceEntry" (
  "id" UUID NOT NULL, "cabinetId" UUID NOT NULL, "paymentId" UUID,
  "type" "BalanceEntryType" NOT NULL, "externalKey" TEXT NOT NULL,
  "moneyDelta" DECIMAL(14,2) NOT NULL, "unitsDelta" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BalanceEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BalanceEntry_externalKey_key" ON "BalanceEntry"("externalKey");
CREATE INDEX "BalanceEntry_cabinetId_createdAt_idx" ON "BalanceEntry"("cabinetId", "createdAt");
ALTER TABLE "BalanceEntry" ADD CONSTRAINT "BalanceEntry_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BalanceEntry" ADD CONSTRAINT "BalanceEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
