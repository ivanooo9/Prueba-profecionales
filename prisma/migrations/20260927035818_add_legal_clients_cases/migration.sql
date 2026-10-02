-- CreateTable
CREATE TABLE "LegalClient" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "identificationType" TEXT NOT NULL DEFAULT 'cedula',
    "identification" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "clientType" TEXT NOT NULL DEFAULT 'persona_natural',
    "companyName" TEXT,
    "companyRuc" TEXT,
    "legalRepresentative" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalCase" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "internalCaseNumber" TEXT NOT NULL,
    "judicialProcessNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "processType" TEXT,
    "legalArea" TEXT NOT NULL DEFAULT 'Civil',
    "status" TEXT NOT NULL DEFAULT 'Nuevo',
    "priority" TEXT NOT NULL DEFAULT 'Media',
    "responsibleUserId" INTEGER,
    "assignedLawyer" TEXT,
    "courtName" TEXT,
    "judgeName" TEXT,
    "claimAmount" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedEndDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalClient_organizationId_status_idx" ON "LegalClient"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LegalClient_organizationId_name_idx" ON "LegalClient"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LegalClient_organizationId_identification_key" ON "LegalClient"("organizationId", "identification");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_status_idx" ON "LegalCase"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_legalArea_idx" ON "LegalCase"("organizationId", "legalArea");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_clientId_idx" ON "LegalCase"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_responsibleUserId_idx" ON "LegalCase"("organizationId", "responsibleUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalCase_organizationId_internalCaseNumber_key" ON "LegalCase"("organizationId", "internalCaseNumber");

-- AddForeignKey
ALTER TABLE "LegalClient" ADD CONSTRAINT "LegalClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "LegalClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
