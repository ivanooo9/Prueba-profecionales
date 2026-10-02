-- CreateTable
CREATE TABLE "DentalBudget" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalBudgetItem" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "budgetId" INTEGER NOT NULL,
    "treatmentItemId" INTEGER,
    "procedureName" TEXT NOT NULL,
    "toothNumber" INTEGER,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DentalBudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalPayment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "budgetId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DentalPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalBudget_organizationId_idx" ON "DentalBudget"("organizationId");

-- CreateIndex
CREATE INDEX "DentalBudget_dentalRecordId_idx" ON "DentalBudget"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalBudget_treatmentPlanId_idx" ON "DentalBudget"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalBudget_organizationId_status_idx" ON "DentalBudget"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DentalBudgetItem_organizationId_idx" ON "DentalBudgetItem"("organizationId");

-- CreateIndex
CREATE INDEX "DentalBudgetItem_budgetId_idx" ON "DentalBudgetItem"("budgetId");

-- CreateIndex
CREATE INDEX "DentalBudgetItem_treatmentItemId_idx" ON "DentalBudgetItem"("treatmentItemId");

-- CreateIndex
CREATE INDEX "DentalPayment_organizationId_idx" ON "DentalPayment"("organizationId");

-- CreateIndex
CREATE INDEX "DentalPayment_budgetId_idx" ON "DentalPayment"("budgetId");

-- CreateIndex
CREATE INDEX "DentalPayment_paidAt_idx" ON "DentalPayment"("paidAt");

-- AddForeignKey
ALTER TABLE "DentalBudget" ADD CONSTRAINT "DentalBudget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalBudget" ADD CONSTRAINT "DentalBudget_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalBudget" ADD CONSTRAINT "DentalBudget_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalBudgetItem" ADD CONSTRAINT "DentalBudgetItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalBudgetItem" ADD CONSTRAINT "DentalBudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "DentalBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalBudgetItem" ADD CONSTRAINT "DentalBudgetItem_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "DentalTreatmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPayment" ADD CONSTRAINT "DentalPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPayment" ADD CONSTRAINT "DentalPayment_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "DentalBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
