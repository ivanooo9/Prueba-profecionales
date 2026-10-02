-- CreateTable
CREATE TABLE "ArchitectureDocument" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stageId" INTEGER,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'Plano',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Borrador',
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureDocumentVersion" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "notes" TEXT,
    "uploadedByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchitectureDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchitectureDocument_organizationId_status_idx" ON "ArchitectureDocument"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureDocument_organizationId_projectId_idx" ON "ArchitectureDocument"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ArchitectureDocument_projectId_stageId_idx" ON "ArchitectureDocument"("projectId", "stageId");

-- CreateIndex
CREATE INDEX "ArchitectureDocumentVersion_organizationId_documentId_idx" ON "ArchitectureDocumentVersion"("organizationId", "documentId");

-- CreateIndex
CREATE INDEX "ArchitectureDocumentVersion_documentId_versionNumber_idx" ON "ArchitectureDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureDocumentVersion_documentId_versionNumber_key" ON "ArchitectureDocumentVersion"("documentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArchitectureProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ArchitectureProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDocumentVersion" ADD CONSTRAINT "ArchitectureDocumentVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDocumentVersion" ADD CONSTRAINT "ArchitectureDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ArchitectureDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDocumentVersion" ADD CONSTRAINT "ArchitectureDocumentVersion_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
