-- CreateTable
CREATE TABLE "LegalNotification" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "legalCaseId" INTEGER NOT NULL,
    "reminderId" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "LegalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalNotification_reminderId_key" ON "LegalNotification"("reminderId");

-- CreateIndex
CREATE INDEX "LegalNotification_organizationId_userId_status_idx" ON "LegalNotification"("organizationId", "userId", "status");

-- CreateIndex
CREATE INDEX "LegalNotification_organizationId_userId_createdAt_idx" ON "LegalNotification"("organizationId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "LegalNotification_legalCaseId_idx" ON "LegalNotification"("legalCaseId");

-- AddForeignKey
ALTER TABLE "LegalNotification" ADD CONSTRAINT "LegalNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalNotification" ADD CONSTRAINT "LegalNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalNotification" ADD CONSTRAINT "LegalNotification_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalNotification" ADD CONSTRAINT "LegalNotification_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "LegalReminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
