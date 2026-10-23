-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcademicPeriodType" AS ENUM ('YEAR', 'SEMESTER', 'QUIMESTER', 'TRIMESTER', 'BIMESTER', 'PARTIAL');

-- CreateEnum
CREATE TYPE "AcademicPeriodStatus" AS ENUM ('ACTIVE', 'LOCKED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcademicEvaluationSchemeStatus" AS ENUM ('DRAFT', 'VALID', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AcademicGradeStatus" AS ENUM ('PENDING', 'GRADED', 'ABSENT', 'EXCUSED');

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "name" TEXT NOT NULL,
    "type" "AcademicPeriodType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AcademicPeriodStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicEvaluationScheme" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "academicPeriodId" INTEGER NOT NULL,
    "maxScale" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    "minPassingScore" DECIMAL(5,2) NOT NULL DEFAULT 7.0,
    "status" "AcademicEvaluationSchemeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicEvaluationScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicEvaluationCategory" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "schemeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercentage" DECIMAL(5,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicEvaluationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicGradeAuditLog" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "previousScore" DECIMAL(5,2),
    "newScore" DECIMAL(5,2),
    "previousStatus" "AcademicGradeStatus",
    "newStatus" "AcademicGradeStatus" NOT NULL,
    "changedByUserId" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicGradeAuditLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable AcademicEnrollment
ALTER TABLE "AcademicEnrollment" ADD COLUMN "academicYearId" INTEGER;

-- AlterTable AcademicActivity
ALTER TABLE "AcademicActivity" ADD COLUMN "academicPeriodId" INTEGER,
ADD COLUMN "categoryId" INTEGER,
ADD COLUMN "evaluationSchemeId" INTEGER;

-- AlterTable AcademicGrade
ALTER TABLE "AcademicGrade" ADD COLUMN "enrollmentId" INTEGER,
ADD COLUMN "status" "AcademicGradeStatus" NOT NULL DEFAULT 'GRADED',
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "score" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "gradedAt" DROP NOT NULL,
ALTER COLUMN "gradedAt" DROP DEFAULT;

-- Set default of status to PENDING for new inserts
ALTER TABLE "AcademicGrade" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_organizationId_name_key" ON "AcademicYear"("organizationId", "name");
CREATE INDEX "AcademicYear_organizationId_status_idx" ON "AcademicYear"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AcademicPeriod_organizationId_status_idx" ON "AcademicPeriod"("organizationId", "status");
CREATE INDEX "AcademicPeriod_academicYearId_order_idx" ON "AcademicPeriod"("academicYearId", "order");
CREATE INDEX "AcademicPeriod_parentId_idx" ON "AcademicPeriod"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicEvaluationScheme_organizationId_courseId_subjectId_academicPeriodId_key" ON "AcademicEvaluationScheme"("organizationId", "courseId", "subjectId", "academicPeriodId");
CREATE INDEX "AcademicEvaluationScheme_organizationId_status_idx" ON "AcademicEvaluationScheme"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AcademicEvaluationCategory_schemeId_order_idx" ON "AcademicEvaluationCategory"("schemeId", "order");

-- CreateIndex
CREATE INDEX "AcademicGradeAuditLog_gradeId_createdAt_idx" ON "AcademicGradeAuditLog"("gradeId", "createdAt");
CREATE INDEX "AcademicGradeAuditLog_organizationId_changedByUserId_idx" ON "AcademicGradeAuditLog"("organizationId", "changedByUserId");

-- CreateIndex on modified existing tables
CREATE INDEX "AcademicEnrollment_academicYearId_idx" ON "AcademicEnrollment"("academicYearId");
CREATE INDEX "AcademicActivity_academicPeriodId_idx" ON "AcademicActivity"("academicPeriodId");
CREATE INDEX "AcademicActivity_evaluationSchemeId_idx" ON "AcademicActivity"("evaluationSchemeId");
CREATE INDEX "AcademicActivity_categoryId_idx" ON "AcademicActivity"("categoryId");
CREATE INDEX "AcademicGrade_organizationId_enrollmentId_idx" ON "AcademicGrade"("organizationId", "enrollmentId");
CREATE INDEX "AcademicGrade_organizationId_status_idx" ON "AcademicGrade"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicEvaluationScheme" ADD CONSTRAINT "AcademicEvaluationScheme_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicEvaluationScheme" ADD CONSTRAINT "AcademicEvaluationScheme_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AcademicCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicEvaluationScheme" ADD CONSTRAINT "AcademicEvaluationScheme_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "AcademicSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicEvaluationScheme" ADD CONSTRAINT "AcademicEvaluationScheme_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicEvaluationCategory" ADD CONSTRAINT "AcademicEvaluationCategory_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "AcademicEvaluationScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGradeAuditLog" ADD CONSTRAINT "AcademicGradeAuditLog_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "AcademicGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicGradeAuditLog" ADD CONSTRAINT "AcademicGradeAuditLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicEnrollment" ADD CONSTRAINT "AcademicEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicActivity" ADD CONSTRAINT "AcademicActivity_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademicActivity" ADD CONSTRAINT "AcademicActivity_evaluationSchemeId_fkey" FOREIGN KEY ("evaluationSchemeId") REFERENCES "AcademicEvaluationScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademicActivity" ADD CONSTRAINT "AcademicActivity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AcademicEvaluationCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGrade" ADD CONSTRAINT "AcademicGrade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "AcademicEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
