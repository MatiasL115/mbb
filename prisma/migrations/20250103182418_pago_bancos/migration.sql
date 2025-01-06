-- DropIndex
DROP INDEX "LoanPayment_installmentId_key";

-- DropIndex
DROP INDEX "LoanPayment_paymentDate_idx";

-- DropIndex
DROP INDEX "LoanPayment_registeredById_idx";

-- CreateIndex
CREATE INDEX "LoanPayment_installmentId_idx" ON "LoanPayment"("installmentId");
