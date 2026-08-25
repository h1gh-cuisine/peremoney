CREATE TYPE "InvoiceCreationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'UNCERTAIN', 'FAILED');
ALTER TABLE "Payment"
  ADD COLUMN "invoiceIdempotencyKey" TEXT,
  ADD COLUMN "invoiceRequestHash" TEXT,
  ADD COLUMN "invoiceCreationStatus" "InvoiceCreationStatus" NOT NULL DEFAULT 'PENDING';
CREATE UNIQUE INDEX "Payment_invoiceIdempotencyKey_key" ON "Payment"("invoiceIdempotencyKey");
