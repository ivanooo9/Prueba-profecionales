-- CreateTable
CREATE TABLE "DentalToothEvent" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "dentalRecordId" INTEGER NOT NULL,
    "toothNumber" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'STATE_CHANGE',
    "previousState" TEXT,
    "newState" TEXT NOT NULL,
    "previousSurfaces" JSONB,
    "newSurfaces" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DentalToothEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalToothEvent_organizationId_idx" ON "DentalToothEvent"("organizationId");

-- CreateIndex
CREATE INDEX "DentalToothEvent_dentalRecordId_idx" ON "DentalToothEvent"("dentalRecordId");

-- CreateIndex
CREATE INDEX "DentalToothEvent_dentalRecordId_toothNumber_idx" ON "DentalToothEvent"("dentalRecordId", "toothNumber");

-- CreateIndex
CREATE INDEX "DentalToothEvent_createdAt_idx" ON "DentalToothEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "DentalToothEvent" ADD CONSTRAINT "DentalToothEvent_dentalRecordId_fkey" FOREIGN KEY ("dentalRecordId") REFERENCES "DentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalToothEvent" ADD CONSTRAINT "DentalToothEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
