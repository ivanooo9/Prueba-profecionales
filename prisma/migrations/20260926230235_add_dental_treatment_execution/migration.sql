-- CreateTable
CREATE TABLE "DentalTreatmentExecution" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER NOT NULL,
    "treatmentItemId" INTEGER NOT NULL,
    "performedByUserId" INTEGER,
    "toothNumber" INTEGER,
    "procedureName" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DentalTreatmentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_organizationId_idx" ON "DentalTreatmentExecution"("organizationId");

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_dentalRecordId_idx" ON "DentalTreatmentExecution"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_treatmentPlanId_idx" ON "DentalTreatmentExecution"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_treatmentItemId_idx" ON "DentalTreatmentExecution"("treatmentItemId");

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_toothNumber_idx" ON "DentalTreatmentExecution"("toothNumber");

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_performedAt_idx" ON "DentalTreatmentExecution"("performedAt");

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_performedByUserId_idx" ON "DentalTreatmentExecution"("performedByUserId");

-- AddForeignKey
ALTER TABLE "DentalTreatmentExecution" ADD CONSTRAINT "DentalTreatmentExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentExecution" ADD CONSTRAINT "DentalTreatmentExecution_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentExecution" ADD CONSTRAINT "DentalTreatmentExecution_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentExecution" ADD CONSTRAINT "DentalTreatmentExecution_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "DentalTreatmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentExecution" ADD CONSTRAINT "DentalTreatmentExecution_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
