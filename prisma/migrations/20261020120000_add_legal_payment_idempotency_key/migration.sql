-- AlterTable
ALTER TABLE "LegalPayment" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegalPayment_organizationId_idempotencyKey_key" ON "LegalPayment"("organizationId", "idempotencyKey");
