-- CreateTable
CREATE TABLE "LegalReminder" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "legalCaseId" INTEGER NOT NULL,
    "userId" INTEGER,
    "sourceType" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalReminder_organizationId_remindAt_idx" ON "LegalReminder"("organizationId", "remindAt");

-- CreateIndex
CREATE INDEX "LegalReminder_organizationId_legalCaseId_idx" ON "LegalReminder"("organizationId", "legalCaseId");

-- CreateIndex
CREATE INDEX "LegalReminder_userId_remindAt_idx" ON "LegalReminder"("userId", "remindAt");

-- CreateIndex
CREATE INDEX "LegalReminder_sourceType_sourceId_idx" ON "LegalReminder"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "LegalReminder" ADD CONSTRAINT "LegalReminder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalReminder" ADD CONSTRAINT "LegalReminder_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalReminder" ADD CONSTRAINT "LegalReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalReminder" ADD CONSTRAINT "LegalReminder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
