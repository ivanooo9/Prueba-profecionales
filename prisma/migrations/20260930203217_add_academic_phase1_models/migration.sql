-- CreateTable
CREATE TABLE "AcademicCourse" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "classroom" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tutorUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSubject" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "hoursPerWeek" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "teacherUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicStudent" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "identification" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicEnrollment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicCourse_organizationId_status_idx" ON "AcademicCourse"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AcademicCourse_tutorUserId_idx" ON "AcademicCourse"("tutorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicCourse_organizationId_name_key" ON "AcademicCourse"("organizationId", "name");

-- CreateIndex
CREATE INDEX "AcademicSubject_organizationId_courseId_idx" ON "AcademicSubject"("organizationId", "courseId");

-- CreateIndex
CREATE INDEX "AcademicSubject_teacherUserId_idx" ON "AcademicSubject"("teacherUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicSubject_courseId_name_key" ON "AcademicSubject"("courseId", "name");

-- CreateIndex
CREATE INDEX "AcademicStudent_organizationId_status_idx" ON "AcademicStudent"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AcademicStudent_organizationId_lastName_firstName_idx" ON "AcademicStudent"("organizationId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicStudent_organizationId_identification_key" ON "AcademicStudent"("organizationId", "identification");

-- CreateIndex
CREATE INDEX "AcademicEnrollment_organizationId_courseId_idx" ON "AcademicEnrollment"("organizationId", "courseId");

-- CreateIndex
CREATE INDEX "AcademicEnrollment_organizationId_studentId_idx" ON "AcademicEnrollment"("organizationId", "studentId");

-- CreateIndex
CREATE INDEX "AcademicEnrollment_organizationId_status_idx" ON "AcademicEnrollment"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicEnrollment_studentId_courseId_key" ON "AcademicEnrollment"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "AcademicCourse" ADD CONSTRAINT "AcademicCourse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicCourse" ADD CONSTRAINT "AcademicCourse_tutorUserId_fkey" FOREIGN KEY ("tutorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSubject" ADD CONSTRAINT "AcademicSubject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSubject" ADD CONSTRAINT "AcademicSubject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AcademicCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSubject" ADD CONSTRAINT "AcademicSubject_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicStudent" ADD CONSTRAINT "AcademicStudent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicEnrollment" ADD CONSTRAINT "AcademicEnrollment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicEnrollment" ADD CONSTRAINT "AcademicEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AcademicCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicEnrollment" ADD CONSTRAINT "AcademicEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "AcademicStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
