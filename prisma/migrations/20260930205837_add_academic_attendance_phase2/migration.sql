-- CreateTable
CREATE TABLE "AcademicClassSession" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "subjectId" INTEGER,
    "teacherUserId" INTEGER,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "classroom" TEXT,
    "topic" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicAttendanceRecord" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicClassSession_organizationId_courseId_sessionDate_idx" ON "AcademicClassSession"("organizationId", "courseId", "sessionDate");

-- CreateIndex
CREATE INDEX "AcademicClassSession_organizationId_status_idx" ON "AcademicClassSession"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AcademicClassSession_teacherUserId_idx" ON "AcademicClassSession"("teacherUserId");

-- CreateIndex
CREATE INDEX "AcademicClassSession_subjectId_idx" ON "AcademicClassSession"("subjectId");

-- CreateIndex
CREATE INDEX "AcademicAttendanceRecord_organizationId_sessionId_idx" ON "AcademicAttendanceRecord"("organizationId", "sessionId");

-- CreateIndex
CREATE INDEX "AcademicAttendanceRecord_organizationId_studentId_idx" ON "AcademicAttendanceRecord"("organizationId", "studentId");

-- CreateIndex
CREATE INDEX "AcademicAttendanceRecord_organizationId_status_idx" ON "AcademicAttendanceRecord"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicAttendanceRecord_sessionId_studentId_key" ON "AcademicAttendanceRecord"("sessionId", "studentId");

-- AddForeignKey
ALTER TABLE "AcademicClassSession" ADD CONSTRAINT "AcademicClassSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClassSession" ADD CONSTRAINT "AcademicClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AcademicCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClassSession" ADD CONSTRAINT "AcademicClassSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "AcademicSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClassSession" ADD CONSTRAINT "AcademicClassSession_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicAttendanceRecord" ADD CONSTRAINT "AcademicAttendanceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicAttendanceRecord" ADD CONSTRAINT "AcademicAttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicAttendanceRecord" ADD CONSTRAINT "AcademicAttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "AcademicStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
