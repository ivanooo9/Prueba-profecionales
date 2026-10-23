-- AlterTable
ALTER TABLE "AcademicYear" ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- CreatePartialUniqueIndex: maximum 1 ACTIVE academic year per organization
CREATE UNIQUE INDEX "AcademicYear_one_active_per_organization_idx" ON "AcademicYear"("organizationId") WHERE "status" = 'ACTIVE';

