-- AlterTable: Ensure ArchitectureDocument referential constraints are RESTRICT / SET NULL
ALTER TABLE "ArchitectureDocument" DROP CONSTRAINT IF EXISTS "ArchitectureDocument_organizationId_fkey";
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArchitectureDocument" DROP CONSTRAINT IF EXISTS "ArchitectureDocument_projectId_fkey";
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArchitectureProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArchitectureDocument" DROP CONSTRAINT IF EXISTS "ArchitectureDocument_stageId_fkey";
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ArchitectureProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ArchitectureDocument" DROP CONSTRAINT IF EXISTS "ArchitectureDocument_createdByUserId_fkey";
ALTER TABLE "ArchitectureDocument" ADD CONSTRAINT "ArchitectureDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Ensure ArchitectureDocumentVersion referential constraints are RESTRICT
ALTER TABLE "ArchitectureDocumentVersion" DROP CONSTRAINT IF EXISTS "ArchitectureDocumentVersion_organizationId_fkey";
ALTER TABLE "ArchitectureDocumentVersion" ADD CONSTRAINT "ArchitectureDocumentVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArchitectureDocumentVersion" DROP CONSTRAINT IF EXISTS "ArchitectureDocumentVersion_documentId_fkey";
ALTER TABLE "ArchitectureDocumentVersion" ADD CONSTRAINT "ArchitectureDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ArchitectureDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArchitectureDocumentVersion" DROP CONSTRAINT IF EXISTS "ArchitectureDocumentVersion_uploadedByUserId_fkey";
ALTER TABLE "ArchitectureDocumentVersion" ADD CONSTRAINT "ArchitectureDocumentVersion_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;