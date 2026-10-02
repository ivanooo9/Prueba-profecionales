-- CreateTable
CREATE TABLE "DentalConsentTemplate" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "procedureCode" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalConsent" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "templateId" INTEGER,
    "treatmentPlanId" INTEGER,
    "treatmentItemId" INTEGER,
    "executionId" INTEGER,
    "appointmentId" INTEGER,
    "title" TEXT NOT NULL,
    "templateVersion" INTEGER,
    "contentSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "patientNameSnapshot" TEXT NOT NULL,
    "patientIdNumberSnapshot" TEXT,
    "professionalNameSnapshot" TEXT,
    "issuedByUserId" INTEGER,
    "signedByPatientName" TEXT,
    "signedByProfessionalName" TEXT,
    "patientSignatureData" TEXT,
    "professionalSignatureData" TEXT,
    "issuedAt" TIMESTAMP(3),
    "patientSignedAt" TIMESTAMP(3),
    "professionalSignedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalConsentTemplate_organizationId_isActive_idx" ON "DentalConsentTemplate"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "DentalConsentTemplate_organizationId_category_idx" ON "DentalConsentTemplate"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DentalConsentTemplate_organizationId_name_version_key" ON "DentalConsentTemplate"("organizationId", "name", "version");

-- CreateIndex
CREATE INDEX "DentalConsent_organizationId_idx" ON "DentalConsent"("organizationId");

-- CreateIndex
CREATE INDEX "DentalConsent_dentalRecordId_idx" ON "DentalConsent"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalConsent_patientId_idx" ON "DentalConsent"("patientId");

-- CreateIndex
CREATE INDEX "DentalConsent_organizationId_status_idx" ON "DentalConsent"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DentalConsent_templateId_idx" ON "DentalConsent"("templateId");

-- CreateIndex
CREATE INDEX "DentalConsent_treatmentPlanId_idx" ON "DentalConsent"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalConsent_treatmentItemId_idx" ON "DentalConsent"("treatmentItemId");

-- CreateIndex
CREATE INDEX "DentalConsent_executionId_idx" ON "DentalConsent"("executionId");

-- CreateIndex
CREATE INDEX "DentalConsent_appointmentId_idx" ON "DentalConsent"("appointmentId");

-- AddForeignKey
ALTER TABLE "DentalConsentTemplate" ADD CONSTRAINT "DentalConsentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DentalConsentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "DentalTreatmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "DentalTreatmentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "DentalAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalConsent" ADD CONSTRAINT "DentalConsent_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
