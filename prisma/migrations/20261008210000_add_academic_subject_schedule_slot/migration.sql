-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."AcademicSubjectScheduleSlot" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherUserId" INTEGER,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "pedagogicalHours" INTEGER NOT NULL DEFAULT 1,
    "room" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicSubjectScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AcademicSubjectScheduleSlot_organizationId_courseId_dayOfWee_idx" ON "public"."AcademicSubjectScheduleSlot"("organizationId", "courseId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "AcademicSubjectScheduleSlot_organizationId_teacherUserId_day_idx" ON "public"."AcademicSubjectScheduleSlot"("organizationId", "teacherUserId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "AcademicSubjectScheduleSlot_organizationId_subjectId_status_idx" ON "public"."AcademicSubjectScheduleSlot"("organizationId", "subjectId", "status");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademicSubjectScheduleSlot_organizationId_fkey'
  ) THEN
    ALTER TABLE "public"."AcademicSubjectScheduleSlot" ADD CONSTRAINT "AcademicSubjectScheduleSlot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademicSubjectScheduleSlot_academicYearId_fkey'
  ) THEN
    ALTER TABLE "public"."AcademicSubjectScheduleSlot" ADD CONSTRAINT "AcademicSubjectScheduleSlot_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademicSubjectScheduleSlot_courseId_fkey'
  ) THEN
    ALTER TABLE "public"."AcademicSubjectScheduleSlot" ADD CONSTRAINT "AcademicSubjectScheduleSlot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."AcademicCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademicSubjectScheduleSlot_subjectId_fkey'
  ) THEN
    ALTER TABLE "public"."AcademicSubjectScheduleSlot" ADD CONSTRAINT "AcademicSubjectScheduleSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."AcademicSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademicSubjectScheduleSlot_teacherUserId_fkey'
  ) THEN
    ALTER TABLE "public"."AcademicSubjectScheduleSlot" ADD CONSTRAINT "AcademicSubjectScheduleSlot_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
