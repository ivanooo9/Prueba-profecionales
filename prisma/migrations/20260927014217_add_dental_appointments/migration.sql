-- AlterTable
ALTER TABLE "DentalTreatmentExecution" ADD COLUMN     "appointmentId" INTEGER;

-- CreateTable
CREATE TABLE "DentalAppointment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER,
    "treatmentItemId" INTEGER,
    "professionalUserId" INTEGER NOT NULL,
    "dentistName" TEXT,
    "title" TEXT,
    "reason" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CONSULTATION',
    "notes" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalAppointment_organizationId_idx" ON "DentalAppointment"("organizationId");

-- CreateIndex
CREATE INDEX "DentalAppointment_dentalRecordId_idx" ON "DentalAppointment"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalAppointment_patientId_idx" ON "DentalAppointment"("patientId");

-- CreateIndex
CREATE INDEX "DentalAppointment_professionalUserId_scheduledAt_idx" ON "DentalAppointment"("professionalUserId", "scheduledAt");

-- CreateIndex
CREATE INDEX "DentalAppointment_organizationId_scheduledAt_idx" ON "DentalAppointment"("organizationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "DentalAppointment_organizationId_status_idx" ON "DentalAppointment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DentalAppointment_treatmentPlanId_idx" ON "DentalAppointment"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalAppointment_treatmentItemId_idx" ON "DentalAppointment"("treatmentItemId");

-- CreateIndex
CREATE INDEX "DentalTreatmentExecution_appointmentId_idx" ON "DentalTreatmentExecution"("appointmentId");

-- AddForeignKey
ALTER TABLE "DentalTreatmentExecution" ADD CONSTRAINT "DentalTreatmentExecution_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "DentalAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalAppointment" ADD CONSTRAINT "DentalAppointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalAppointment" ADD CONSTRAINT "DentalAppointment_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalAppointment" ADD CONSTRAINT "DentalAppointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalAppointment" ADD CONSTRAINT "DentalAppointment_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalAppointment" ADD CONSTRAINT "DentalAppointment_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "DentalTreatmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalAppointment" ADD CONSTRAINT "DentalAppointment_professionalUserId_fkey" FOREIGN KEY ("professionalUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
