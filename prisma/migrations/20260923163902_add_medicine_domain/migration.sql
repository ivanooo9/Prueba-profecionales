-- CreateTable
CREATE TABLE "MedicalPatient" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "idNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "bloodType" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "emergencyContact" JSONB,
    "status" TEXT NOT NULL DEFAULT 'CONTROLADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "bloodType" TEXT,
    "allergies" TEXT,
    "currentIllnesses" TEXT,
    "chronicDiseases" TEXT,
    "currentMedications" TEXT,
    "personalHistory" TEXT,
    "familyHistory" TEXT,
    "previousSurgeries" TEXT,
    "hospitalizations" TEXT,
    "tobaccoUse" TEXT,
    "alcoholUse" TEXT,
    "pregnancyStatus" TEXT,
    "gestationalWeeks" INTEGER,
    "breastfeeding" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalConsultation" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "professionalId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "cie10Code" TEXT,
    "cie10Description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "signedBy" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalVitalSigns" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "consultationId" INTEGER,
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "heartRate" INTEGER,
    "temperatureC" DOUBLE PRECISION,
    "spo2" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalVitalSigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalPrescription" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "consultationId" INTEGER,
    "diagnosis" TEXT,
    "generalInstructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "signedBy" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalPrescriptionItem" (
    "id" SERIAL NOT NULL,
    "prescriptionId" INTEGER NOT NULL,
    "medicationName" TEXT NOT NULL,
    "genericName" TEXT,
    "concentration" TEXT,
    "pharmaceuticalForm" TEXT,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'Vía oral',
    "duration" TEXT,
    "quantity" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalPrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalFollowUp" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "consultationId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalPatient_organizationId_status_idx" ON "MedicalPatient"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MedicalPatient_organizationId_idNumber_idx" ON "MedicalPatient"("organizationId", "idNumber");

-- CreateIndex
CREATE INDEX "MedicalPatient_organizationId_name_idx" ON "MedicalPatient"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_patientId_key" ON "MedicalRecord"("patientId");

-- CreateIndex
CREATE INDEX "MedicalRecord_organizationId_idx" ON "MedicalRecord"("organizationId");

-- CreateIndex
CREATE INDEX "MedicalConsultation_organizationId_patientId_idx" ON "MedicalConsultation"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalConsultation_organizationId_status_idx" ON "MedicalConsultation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MedicalConsultation_organizationId_date_idx" ON "MedicalConsultation"("organizationId", "date");

-- CreateIndex
CREATE INDEX "MedicalVitalSigns_organizationId_patientId_idx" ON "MedicalVitalSigns"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalVitalSigns_consultationId_idx" ON "MedicalVitalSigns"("consultationId");

-- CreateIndex
CREATE INDEX "MedicalPrescription_organizationId_patientId_idx" ON "MedicalPrescription"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalPrescription_consultationId_idx" ON "MedicalPrescription"("consultationId");

-- CreateIndex
CREATE INDEX "MedicalPrescription_organizationId_status_idx" ON "MedicalPrescription"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MedicalPrescriptionItem_prescriptionId_idx" ON "MedicalPrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "MedicalFollowUp_organizationId_patientId_idx" ON "MedicalFollowUp"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalFollowUp_organizationId_status_idx" ON "MedicalFollowUp"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MedicalFollowUp_dueDate_idx" ON "MedicalFollowUp"("dueDate");

-- AddForeignKey
ALTER TABLE "MedicalPatient" ADD CONSTRAINT "MedicalPatient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalConsultation" ADD CONSTRAINT "MedicalConsultation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalConsultation" ADD CONSTRAINT "MedicalConsultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalVitalSigns" ADD CONSTRAINT "MedicalVitalSigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalVitalSigns" ADD CONSTRAINT "MedicalVitalSigns_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalVitalSigns" ADD CONSTRAINT "MedicalVitalSigns_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "MedicalConsultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalPrescription" ADD CONSTRAINT "MedicalPrescription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalPrescription" ADD CONSTRAINT "MedicalPrescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalPrescription" ADD CONSTRAINT "MedicalPrescription_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "MedicalConsultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalPrescriptionItem" ADD CONSTRAINT "MedicalPrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "MedicalPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFollowUp" ADD CONSTRAINT "MedicalFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFollowUp" ADD CONSTRAINT "MedicalFollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFollowUp" ADD CONSTRAINT "MedicalFollowUp_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "MedicalConsultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
