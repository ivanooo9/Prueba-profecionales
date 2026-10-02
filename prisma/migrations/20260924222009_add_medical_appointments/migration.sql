-- CreateTable
CREATE TABLE "MedicalAppointment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "professionalId" INTEGER,
    "consultationId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FIRST_CONSULTATION',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "room" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalAppointment_organizationId_patientId_idx" ON "MedicalAppointment"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalAppointment_organizationId_date_idx" ON "MedicalAppointment"("organizationId", "date");

-- CreateIndex
CREATE INDEX "MedicalAppointment_organizationId_status_idx" ON "MedicalAppointment"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "MedicalAppointment" ADD CONSTRAINT "MedicalAppointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAppointment" ADD CONSTRAINT "MedicalAppointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAppointment" ADD CONSTRAINT "MedicalAppointment_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "MedicalConsultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
