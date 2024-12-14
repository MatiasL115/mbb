-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentTerm" TEXT,
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'contado',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "PaymentRequest_providerId_idx" ON "PaymentRequest"("providerId");

-- CreateIndex
CREATE INDEX "PaymentRequest_requesterId_idx" ON "PaymentRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE INDEX "PaymentRequest_type_idx" ON "PaymentRequest"("type");
