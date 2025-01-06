-- CreateTable
CREATE TABLE "PurchaseCreditNote" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT,
    "projectId" TEXT,
    "purchaseInvoiceId" TEXT,
    "reason" TEXT,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseCreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT,
    "projectId" TEXT,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseCreditNote_number_key" ON "PurchaseCreditNote"("number");

-- CreateIndex
CREATE INDEX "PurchaseCreditNote_providerId_idx" ON "PurchaseCreditNote"("providerId");

-- CreateIndex
CREATE INDEX "PurchaseCreditNote_projectId_idx" ON "PurchaseCreditNote"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseCreditNote_purchaseInvoiceId_idx" ON "PurchaseCreditNote"("purchaseInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_number_key" ON "PurchaseReceipt"("number");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_providerId_idx" ON "PurchaseReceipt"("providerId");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_projectId_idx" ON "PurchaseReceipt"("projectId");

-- AddForeignKey
ALTER TABLE "PurchaseCreditNote" ADD CONSTRAINT "PurchaseCreditNote_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseCreditNote" ADD CONSTRAINT "PurchaseCreditNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseCreditNote" ADD CONSTRAINT "PurchaseCreditNote_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
