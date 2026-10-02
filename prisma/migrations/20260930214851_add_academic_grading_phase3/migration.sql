-- CreateTable
CREATE TABLE "AcademicActivity" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherUserId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'HOMEWORK',
    "dueDate" TIMESTAMP(3),
    "maxScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicGrade" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "activityId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicActivity_organizationId_courseId_idx" ON "AcademicActivity"("organizationId", "courseId");

-- CreateIndex
CREATE INDEX "AcademicActivity_organizationId_subjectId_idx" ON "AcademicActivity"("organizationId", "subjectId");

-- CreateIndex
CREATE INDEX "AcademicActivity_teacherUserId_idx" ON "AcademicActivity"("teacherUserId");

-- CreateIndex
CREATE INDEX "AcademicActivity_type_idx" ON "AcademicActivity"("type");

-- CreateIndex
CREATE INDEX "AcademicGrade_organizationId_activityId_idx" ON "AcademicGrade"("organizationId", "activityId");

-- CreateIndex
CREATE INDEX "AcademicGrade_organizationId_studentId_idx" ON "AcademicGrade"("organizationId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicGrade_activityId_studentId_key" ON "AcademicGrade"("activityId", "studentId");

-- AddForeignKey
ALTER TABLE "AcademicActivity" ADD CONSTRAINT "AcademicActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicActivity" ADD CONSTRAINT "AcademicActivity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AcademicCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicActivity" ADD CONSTRAINT "AcademicActivity_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "AcademicSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicActivity" ADD CONSTRAINT "AcademicActivity_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGrade" ADD CONSTRAINT "AcademicGrade_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGrade" ADD CONSTRAINT "AcademicGrade_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "AcademicActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGrade" ADD CONSTRAINT "AcademicGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "AcademicStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
