-- CreateTable
CREATE TABLE "DentalToothSnapshot" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "toothNumber" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "surfaces" JSONB NOT NULL,
    "notes" TEXT,
    "suggestedTreatment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalToothSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalToothSnapshot_organizationId_idx" ON "DentalToothSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "DentalToothSnapshot_dentalRecordId_idx" ON "DentalToothSnapshot"("dentalRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "DentalToothSnapshot_dentalRecordId_toothNumber_key" ON "DentalToothSnapshot"("dentalRecordId", "toothNumber");

-- AddForeignKey
ALTER TABLE "DentalToothSnapshot" ADD CONSTRAINT "DentalToothSnapshot_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalToothSnapshot" ADD CONSTRAINT "DentalToothSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
