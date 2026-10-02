-- CreateTable
CREATE TABLE "MedicalLaboratoryResult" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "consultationId" INTEGER,
    "testName" TEXT NOT NULL,
    "category" TEXT,
    "laboratory" TEXT,
    "resultDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "notes" TEXT,
    "results" JSONB,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalLaboratoryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalImagingStudy" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "consultationId" INTEGER,
    "studyType" TEXT NOT NULL,
    "bodyPart" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "report" TEXT,
    "conclusion" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalImagingStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalPreventionRecord" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalPreventionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalLaboratoryResult_organizationId_patientId_idx" ON "MedicalLaboratoryResult"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalLaboratoryResult_organizationId_resultDate_idx" ON "MedicalLaboratoryResult"("organizationId", "resultDate");

-- CreateIndex
CREATE INDEX "MedicalImagingStudy_organizationId_patientId_idx" ON "MedicalImagingStudy"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalImagingStudy_organizationId_performedAt_idx" ON "MedicalImagingStudy"("organizationId", "performedAt");

-- CreateIndex
CREATE INDEX "MedicalPreventionRecord_organizationId_patientId_idx" ON "MedicalPreventionRecord"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalPreventionRecord_organizationId_status_idx" ON "MedicalPreventionRecord"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "MedicalLaboratoryResult" ADD CONSTRAINT "MedicalLaboratoryResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalLaboratoryResult" ADD CONSTRAINT "MedicalLaboratoryResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalLaboratoryResult" ADD CONSTRAINT "MedicalLaboratoryResult_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "MedicalConsultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalImagingStudy" ADD CONSTRAINT "MedicalImagingStudy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalImagingStudy" ADD CONSTRAINT "MedicalImagingStudy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalImagingStudy" ADD CONSTRAINT "MedicalImagingStudy_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "MedicalConsultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalPreventionRecord" ADD CONSTRAINT "MedicalPreventionRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalPreventionRecord" ADD CONSTRAINT "MedicalPreventionRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "MedicalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
