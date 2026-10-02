-- CreateTable
CREATE TABLE "DentalRecord" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "dentalBackground" TEXT,
    "chiefComplaint" TEXT,
    "evaluationNotes" TEXT,
    "diagnosisSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DentalRecord_patientId_key" ON "DentalRecord"("patientId");

-- CreateIndex
CREATE INDEX "DentalRecord_organizationId_idx" ON "DentalRecord"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DentalRecord_organizationId_patientId_key" ON "DentalRecord"("organizationId", "patientId");

-- AddForeignKey
ALTER TABLE "DentalRecord" ADD CONSTRAINT "DentalRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalRecord" ADD CONSTRAINT "DentalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
