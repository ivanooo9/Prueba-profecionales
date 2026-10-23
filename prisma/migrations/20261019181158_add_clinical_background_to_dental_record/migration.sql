-- AlterTable
ALTER TABLE "DentalRecord" ADD COLUMN IF NOT EXISTS "allergies" TEXT,
ADD COLUMN IF NOT EXISTS "currentMedication" TEXT,
ADD COLUMN IF NOT EXISTS "medicalBackground" TEXT;
