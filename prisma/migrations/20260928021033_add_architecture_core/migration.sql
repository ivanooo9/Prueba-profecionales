-- CreateTable
CREATE TABLE "ArchitectureClient" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "taxId" TEXT,
    "taxIdType" TEXT,
    "clientType" TEXT NOT NULL DEFAULT 'Persona',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "notes" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureProject" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Vivienda',
    "location" TEXT,
    "approxAreaM2" DOUBLE PRECISION,
    "levelsCount" INTEGER,
    "leadArchitectUserId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "targetDeliveryDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Planificación',
    "priority" TEXT NOT NULL DEFAULT 'Media',
    "description" TEXT,
    "clientRequirements" TEXT,
    "notes" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedByUserId" INTEGER,
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureProjectStage" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchitectureClient_organizationId_status_idx" ON "ArchitectureClient"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureClient_organizationId_name_idx" ON "ArchitectureClient"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ArchitectureClient_createdByUserId_idx" ON "ArchitectureClient"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureClient_organizationId_taxId_key" ON "ArchitectureClient"("organizationId", "taxId");

-- CreateIndex
CREATE INDEX "ArchitectureProject_organizationId_status_idx" ON "ArchitectureProject"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureProject_organizationId_clientId_idx" ON "ArchitectureProject"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "ArchitectureProject_leadArchitectUserId_idx" ON "ArchitectureProject"("leadArchitectUserId");

-- CreateIndex
CREATE INDEX "ArchitectureProject_createdByUserId_idx" ON "ArchitectureProject"("createdByUserId");

-- CreateIndex
CREATE INDEX "ArchitectureProject_organizationId_createdAt_idx" ON "ArchitectureProject"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureProject_organizationId_code_key" ON "ArchitectureProject"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ArchitectureProjectStage_organizationId_projectId_idx" ON "ArchitectureProjectStage"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ArchitectureProjectStage_projectId_status_idx" ON "ArchitectureProjectStage"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureProjectStage_projectId_order_key" ON "ArchitectureProjectStage"("projectId", "order");

-- AddForeignKey
ALTER TABLE "ArchitectureClient" ADD CONSTRAINT "ArchitectureClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureClient" ADD CONSTRAINT "ArchitectureClient_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureProject" ADD CONSTRAINT "ArchitectureProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureProject" ADD CONSTRAINT "ArchitectureProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ArchitectureClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureProject" ADD CONSTRAINT "ArchitectureProject_leadArchitectUserId_fkey" FOREIGN KEY ("leadArchitectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureProject" ADD CONSTRAINT "ArchitectureProject_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureProject" ADD CONSTRAINT "ArchitectureProject_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureProjectStage" ADD CONSTRAINT "ArchitectureProjectStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureProjectStage" ADD CONSTRAINT "ArchitectureProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArchitectureProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
