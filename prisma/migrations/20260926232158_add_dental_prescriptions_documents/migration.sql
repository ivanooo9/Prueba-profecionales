-- CreateTable
CREATE TABLE "DentalPrescription" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER,
    "treatmentItemId" INTEGER,
    "executionId" INTEGER,
    "diagnosis" TEXT,
    "procedure" TEXT,
    "generalInstructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedByUserId" INTEGER,
    "signedBy" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalPrescriptionItem" (
    "id" SERIAL NOT NULL,
    "prescriptionId" INTEGER NOT NULL,
    "medicationName" TEXT NOT NULL,
    "genericName" TEXT,
    "concentration" TEXT,
    "pharmaceuticalForm" TEXT,
    "dose" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'Vía oral',
    "frequency" TEXT NOT NULL,
    "duration" TEXT,
    "quantity" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalPrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalDocument" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER,
    "treatmentItemId" INTEGER,
    "executionId" INTEGER,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT DEFAULT 'application/pdf',
    "uploadedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalPrescription_organizationId_idx" ON "DentalPrescription"("organizationId");

-- CreateIndex
CREATE INDEX "DentalPrescription_dentalRecordId_idx" ON "DentalPrescription"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalPrescription_patientId_idx" ON "DentalPrescription"("patientId");

-- CreateIndex
CREATE INDEX "DentalPrescription_organizationId_status_idx" ON "DentalPrescription"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DentalPrescription_treatmentPlanId_idx" ON "DentalPrescription"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalPrescription_treatmentItemId_idx" ON "DentalPrescription"("treatmentItemId");

-- CreateIndex
CREATE INDEX "DentalPrescription_executionId_idx" ON "DentalPrescription"("executionId");

-- CreateIndex
CREATE INDEX "DentalPrescription_issuedAt_idx" ON "DentalPrescription"("issuedAt");

-- CreateIndex
CREATE INDEX "DentalPrescriptionItem_prescriptionId_idx" ON "DentalPrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "DentalDocument_organizationId_idx" ON "DentalDocument"("organizationId");

-- CreateIndex
CREATE INDEX "DentalDocument_dentalRecordId_idx" ON "DentalDocument"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalDocument_patientId_idx" ON "DentalDocument"("patientId");

-- CreateIndex
CREATE INDEX "DentalDocument_organizationId_type_idx" ON "DentalDocument"("organizationId", "type");

-- CreateIndex
CREATE INDEX "DentalDocument_treatmentPlanId_idx" ON "DentalDocument"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalDocument_treatmentItemId_idx" ON "DentalDocument"("treatmentItemId");

-- CreateIndex
CREATE INDEX "DentalDocument_date_idx" ON "DentalDocument"("date");

-- AddForeignKey
ALTER TABLE "DentalPrescription" ADD CONSTRAINT "DentalPrescription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPrescription" ADD CONSTRAINT "DentalPrescription_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPrescription" ADD CONSTRAINT "DentalPrescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPrescription" ADD CONSTRAINT "DentalPrescription_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPrescription" ADD CONSTRAINT "DentalPrescription_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "DentalTreatmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPrescription" ADD CONSTRAINT "DentalPrescription_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "DentalTreatmentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPrescription" ADD CONSTRAINT "DentalPrescription_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalPrescriptionItem" ADD CONSTRAINT "DentalPrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "DentalPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDocument" ADD CONSTRAINT "DentalDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDocument" ADD CONSTRAINT "DentalDocument_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDocument" ADD CONSTRAINT "DentalDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDocument" ADD CONSTRAINT "DentalDocument_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDocument" ADD CONSTRAINT "DentalDocument_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "DentalTreatmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDocument" ADD CONSTRAINT "DentalDocument_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "DentalTreatmentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDocument" ADD CONSTRAINT "DentalDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
