-- CreateTable
CREATE TABLE "ArchitectureTask" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stageId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToUserId" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'Media',
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureDeliverable" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stageId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Planos',
    "assignedToUserId" INTEGER,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureMeeting" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "modality" TEXT NOT NULL DEFAULT 'Presencial',
    "meetingType" TEXT NOT NULL DEFAULT 'Reunión',
    "leadArchitectUserId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Programada',
    "notes" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchitectureTask_organizationId_status_idx" ON "ArchitectureTask"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureTask_organizationId_projectId_idx" ON "ArchitectureTask"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ArchitectureTask_projectId_stageId_idx" ON "ArchitectureTask"("projectId", "stageId");

-- CreateIndex
CREATE INDEX "ArchitectureTask_assignedToUserId_idx" ON "ArchitectureTask"("assignedToUserId");

-- CreateIndex
CREATE INDEX "ArchitectureTask_dueDate_idx" ON "ArchitectureTask"("dueDate");

-- CreateIndex
CREATE INDEX "ArchitectureDeliverable_organizationId_status_idx" ON "ArchitectureDeliverable"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureDeliverable_organizationId_projectId_idx" ON "ArchitectureDeliverable"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ArchitectureDeliverable_projectId_stageId_idx" ON "ArchitectureDeliverable"("projectId", "stageId");

-- CreateIndex
CREATE INDEX "ArchitectureDeliverable_assignedToUserId_idx" ON "ArchitectureDeliverable"("assignedToUserId");

-- CreateIndex
CREATE INDEX "ArchitectureDeliverable_dueDate_idx" ON "ArchitectureDeliverable"("dueDate");

-- CreateIndex
CREATE INDEX "ArchitectureMeeting_organizationId_status_idx" ON "ArchitectureMeeting"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureMeeting_organizationId_projectId_idx" ON "ArchitectureMeeting"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ArchitectureMeeting_scheduledAt_idx" ON "ArchitectureMeeting"("scheduledAt");

-- CreateIndex
CREATE INDEX "ArchitectureMeeting_leadArchitectUserId_idx" ON "ArchitectureMeeting"("leadArchitectUserId");

-- AddForeignKey
ALTER TABLE "ArchitectureTask" ADD CONSTRAINT "ArchitectureTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureTask" ADD CONSTRAINT "ArchitectureTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArchitectureProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureTask" ADD CONSTRAINT "ArchitectureTask_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ArchitectureProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureTask" ADD CONSTRAINT "ArchitectureTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureTask" ADD CONSTRAINT "ArchitectureTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDeliverable" ADD CONSTRAINT "ArchitectureDeliverable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDeliverable" ADD CONSTRAINT "ArchitectureDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArchitectureProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDeliverable" ADD CONSTRAINT "ArchitectureDeliverable_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ArchitectureProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDeliverable" ADD CONSTRAINT "ArchitectureDeliverable_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDeliverable" ADD CONSTRAINT "ArchitectureDeliverable_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureMeeting" ADD CONSTRAINT "ArchitectureMeeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureMeeting" ADD CONSTRAINT "ArchitectureMeeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArchitectureProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureMeeting" ADD CONSTRAINT "ArchitectureMeeting_leadArchitectUserId_fkey" FOREIGN KEY ("leadArchitectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureMeeting" ADD CONSTRAINT "ArchitectureMeeting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
