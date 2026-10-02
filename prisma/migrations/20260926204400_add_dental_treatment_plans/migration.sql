-- CreateTable
CREATE TABLE "DentalProcedure" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "defaultPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalTreatmentPlan" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalTreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalTreatmentItem" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER NOT NULL,
    "procedureId" INTEGER,
    "toothNumber" INTEGER,
    "procedureName" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalTreatmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalProcedure_organizationId_idx" ON "DentalProcedure"("organizationId");

-- CreateIndex
CREATE INDEX "DentalProcedure_organizationId_isActive_idx" ON "DentalProcedure"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "DentalTreatmentPlan_organizationId_idx" ON "DentalTreatmentPlan"("organizationId");

-- CreateIndex
CREATE INDEX "DentalTreatmentPlan_dentalRecordId_idx" ON "DentalTreatmentPlan"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalTreatmentPlan_organizationId_status_idx" ON "DentalTreatmentPlan"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DentalTreatmentItem_organizationId_idx" ON "DentalTreatmentItem"("organizationId");

-- CreateIndex
CREATE INDEX "DentalTreatmentItem_treatmentPlanId_idx" ON "DentalTreatmentItem"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "DentalTreatmentItem_procedureId_idx" ON "DentalTreatmentItem"("procedureId");

-- CreateIndex
CREATE INDEX "DentalTreatmentItem_toothNumber_idx" ON "DentalTreatmentItem"("toothNumber");

-- AddForeignKey
ALTER TABLE "DentalProcedure" ADD CONSTRAINT "DentalProcedure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentPlan" ADD CONSTRAINT "DentalTreatmentPlan_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentItem" ADD CONSTRAINT "DentalTreatmentItem_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalTreatmentItem" ADD CONSTRAINT "DentalTreatmentItem_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "DentalProcedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
