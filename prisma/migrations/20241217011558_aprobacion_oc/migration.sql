-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "approvalComment" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT,
ADD COLUMN     "rejectionComment" TEXT,
ALTER COLUMN "date" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PurchaseOrderHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderHistory_orderId_idx" ON "PurchaseOrderHistory"("orderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderHistory_userId_idx" ON "PurchaseOrderHistory"("userId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_approvedById_idx" ON "PurchaseOrder"("approvedById");

-- CreateIndex
CREATE INDEX "PurchaseOrder_rejectedById_idx" ON "PurchaseOrder"("rejectedById");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderHistory" ADD CONSTRAINT "PurchaseOrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderHistory" ADD CONSTRAINT "PurchaseOrderHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
