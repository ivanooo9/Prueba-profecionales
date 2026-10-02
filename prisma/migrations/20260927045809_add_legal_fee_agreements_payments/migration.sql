-- CreateTable
CREATE TABLE "LegalFeeAgreement" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "legalCaseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL,
    "agreedAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalFeeAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalFeeItem" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "feeAgreementId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalFeeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPayment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "feeAgreementId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Transferencia',
    "reference" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalFeeAgreement_organizationId_legalCaseId_idx" ON "LegalFeeAgreement"("organizationId", "legalCaseId");

-- CreateIndex
CREATE INDEX "LegalFeeAgreement_organizationId_status_idx" ON "LegalFeeAgreement"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LegalFeeItem_organizationId_feeAgreementId_idx" ON "LegalFeeItem"("organizationId", "feeAgreementId");

-- CreateIndex
CREATE INDEX "LegalPayment_organizationId_feeAgreementId_idx" ON "LegalPayment"("organizationId", "feeAgreementId");

-- CreateIndex
CREATE INDEX "LegalPayment_organizationId_paidAt_idx" ON "LegalPayment"("organizationId", "paidAt");

-- AddForeignKey
ALTER TABLE "LegalFeeAgreement" ADD CONSTRAINT "LegalFeeAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalFeeAgreement" ADD CONSTRAINT "LegalFeeAgreement_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalFeeAgreement" ADD CONSTRAINT "LegalFeeAgreement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalFeeItem" ADD CONSTRAINT "LegalFeeItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalFeeItem" ADD CONSTRAINT "LegalFeeItem_feeAgreementId_fkey" FOREIGN KEY ("feeAgreementId") REFERENCES "LegalFeeAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPayment" ADD CONSTRAINT "LegalPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPayment" ADD CONSTRAINT "LegalPayment_feeAgreementId_fkey" FOREIGN KEY ("feeAgreementId") REFERENCES "LegalFeeAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPayment" ADD CONSTRAINT "LegalPayment_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
