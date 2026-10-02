-- CreateTable
CREATE TABLE "ArchitectureBudget" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Borrador',
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" INTEGER,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureBudgetItem" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "budgetId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureBudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchitectureBudget_organizationId_projectId_idx" ON "ArchitectureBudget"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ArchitectureBudget_organizationId_status_idx" ON "ArchitectureBudget"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureBudget_projectId_status_idx" ON "ArchitectureBudget"("projectId", "status");

-- CreateIndex
CREATE INDEX "ArchitectureBudgetItem_organizationId_budgetId_idx" ON "ArchitectureBudgetItem"("organizationId", "budgetId");

-- CreateIndex
CREATE INDEX "ArchitectureBudgetItem_budgetId_order_idx" ON "ArchitectureBudgetItem"("budgetId", "order");

-- AddForeignKey
ALTER TABLE "ArchitectureBudget" ADD CONSTRAINT "ArchitectureBudget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureBudget" ADD CONSTRAINT "ArchitectureBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArchitectureProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureBudget" ADD CONSTRAINT "ArchitectureBudget_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureBudget" ADD CONSTRAINT "ArchitectureBudget_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureBudgetItem" ADD CONSTRAINT "ArchitectureBudgetItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureBudgetItem" ADD CONSTRAINT "ArchitectureBudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "ArchitectureBudget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
