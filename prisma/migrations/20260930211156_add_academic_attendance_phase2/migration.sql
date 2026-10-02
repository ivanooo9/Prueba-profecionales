/*
  Warnings:

  - You are about to drop the column `classroom` on the `AcademicClassSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AcademicClassSession_organizationId_courseId_sessionDate_idx";

-- AlterTable
ALTER TABLE "AcademicAttendanceRecord" ALTER COLUMN "status" SET DEFAULT 'PRESENT';

-- AlterTable
ALTER TABLE "AcademicClassSession" DROP COLUMN "classroom",
ADD COLUMN     "room" TEXT;

-- CreateIndex
CREATE INDEX "AcademicClassSession_organizationId_courseId_idx" ON "AcademicClassSession"("organizationId", "courseId");

-- CreateIndex
CREATE INDEX "AcademicClassSession_organizationId_sessionDate_idx" ON "AcademicClassSession"("organizationId", "sessionDate");
