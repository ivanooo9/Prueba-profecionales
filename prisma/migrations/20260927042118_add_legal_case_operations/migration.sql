-- CreateTable
CREATE TABLE "LegalCaseActivity" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "legalCaseId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" INTEGER,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalCaseActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalTask" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "legalCaseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Media',
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "assignedToUserId" INTEGER,
    "assignedTo" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDeadline" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "legalCaseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Media',
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "responsibleUserId" INTEGER,
    "responsible" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalHearing" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "legalCaseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "hearingType" TEXT NOT NULL DEFAULT 'Preliminar',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'Presencial',
    "status" TEXT NOT NULL DEFAULT 'Programada',
    "responsibleUserId" INTEGER,
    "responsible" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalHearing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalCaseActivity_organizationId_legalCaseId_idx" ON "LegalCaseActivity"("organizationId", "legalCaseId");

-- CreateIndex
CREATE INDEX "LegalCaseActivity_legalCaseId_occurredAt_idx" ON "LegalCaseActivity"("legalCaseId", "occurredAt");

-- CreateIndex
CREATE INDEX "LegalTask_organizationId_status_idx" ON "LegalTask"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LegalTask_organizationId_legalCaseId_idx" ON "LegalTask"("organizationId", "legalCaseId");

-- CreateIndex
CREATE INDEX "LegalTask_organizationId_dueDate_idx" ON "LegalTask"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "LegalTask_assignedToUserId_idx" ON "LegalTask"("assignedToUserId");

-- CreateIndex
CREATE INDEX "LegalDeadline_organizationId_status_idx" ON "LegalDeadline"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LegalDeadline_organizationId_legalCaseId_idx" ON "LegalDeadline"("organizationId", "legalCaseId");

-- CreateIndex
CREATE INDEX "LegalDeadline_organizationId_deadlineAt_idx" ON "LegalDeadline"("organizationId", "deadlineAt");

-- CreateIndex
CREATE INDEX "LegalDeadline_responsibleUserId_idx" ON "LegalDeadline"("responsibleUserId");

-- CreateIndex
CREATE INDEX "LegalHearing_organizationId_status_idx" ON "LegalHearing"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LegalHearing_organizationId_legalCaseId_idx" ON "LegalHearing"("organizationId", "legalCaseId");

-- CreateIndex
CREATE INDEX "LegalHearing_organizationId_scheduledAt_idx" ON "LegalHearing"("organizationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "LegalHearing_responsibleUserId_idx" ON "LegalHearing"("responsibleUserId");

-- AddForeignKey
ALTER TABLE "LegalCaseActivity" ADD CONSTRAINT "LegalCaseActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCaseActivity" ADD CONSTRAINT "LegalCaseActivity_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCaseActivity" ADD CONSTRAINT "LegalCaseActivity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTask" ADD CONSTRAINT "LegalTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTask" ADD CONSTRAINT "LegalTask_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTask" ADD CONSTRAINT "LegalTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDeadline" ADD CONSTRAINT "LegalDeadline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDeadline" ADD CONSTRAINT "LegalDeadline_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDeadline" ADD CONSTRAINT "LegalDeadline_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHearing" ADD CONSTRAINT "LegalHearing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHearing" ADD CONSTRAINT "LegalHearing_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHearing" ADD CONSTRAINT "LegalHearing_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
