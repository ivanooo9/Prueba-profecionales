-- DropIndex
DROP INDEX "AcademicEnrollment_studentId_courseId_key";

-- CreateIndex
CREATE INDEX "AcademicEnrollment_organizationId_studentId_courseId_academ_idx" ON "AcademicEnrollment"("organizationId", "studentId", "courseId", "academicYearId");

-- CreatePartialUniqueIndex for modern enrollments with academicYearId
CREATE UNIQUE INDEX "AcademicEnrollment_org_student_course_year_key" ON "AcademicEnrollment"("organizationId", "studentId", "courseId", "academicYearId") WHERE "academicYearId" IS NOT NULL;

-- RenameIndex
ALTER INDEX "AcademicEvaluationScheme_organizationId_courseId_subjectId_acad" RENAME TO "AcademicEvaluationScheme_organizationId_courseId_subjectId__key";

