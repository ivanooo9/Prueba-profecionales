CREATE TABLE "BankAccount" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "accountType" TEXT,
    "accountNumber" TEXT,
    "beneficiaryName" TEXT,
    "qrImageUrl" TEXT,
    "qrImagePublicId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentRequest" ADD COLUMN "bankAccountId" INTEGER;
ALTER TABLE "PaymentRequest" ADD COLUMN "bankAccountSnapshot" JSONB;
ALTER TABLE "PaymentRequest" ADD COLUMN "bankAccountLabel" TEXT;

CREATE INDEX "BankAccount_isActive_deletedAt_idx" ON "BankAccount"("isActive", "deletedAt");
CREATE INDEX "PaymentRequest_bankAccountId_idx" ON "PaymentRequest"("bankAccountId");

ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
