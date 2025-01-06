/*
  Warnings:

  - Changed the type of `paymentMethod` on the `LoanPayment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PYG', 'USD', 'EUR', 'BRL', 'ARS');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS');

-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('REGULAR', 'DEFERRED');

-- CreateEnum
CREATE TYPE "CheckFormat" AS ENUM ('REGULAR', 'COMPACT', 'CONTINUOUS');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('AVAILABLE', 'ISSUED', 'VOIDED', 'CASHED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'RECONCILED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ReconciliationType" AS ENUM ('AUTOMATIC', 'MANUAL', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED');

-- AlterTable
ALTER TABLE "LoanPayment" DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL;

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "type" "AccountType" NOT NULL,
    "alias" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastReconciliationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkbook" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "initialNumber" INTEGER NOT NULL,
    "finalNumber" INTEGER NOT NULL,
    "receptionDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "checkType" "CheckType" NOT NULL,
    "format" "CheckFormat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Check" (
    "id" TEXT NOT NULL,
    "checkbookId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3),
    "amount" DECIMAL(65,30),
    "beneficiary" TEXT,
    "status" "CheckStatus" NOT NULL DEFAULT 'AVAILABLE',
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "checkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankMovement" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "MovementType" NOT NULL,
    "reference" TEXT,
    "status" "MovementStatus" NOT NULL DEFAULT 'PENDING',
    "rawData" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "paymentId" TEXT,
    "periodId" TEXT NOT NULL,
    "reconciliationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciliationType" "ReconciliationType" NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationPeriod" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "startBalance" DECIMAL(65,30) NOT NULL,
    "endBalance" DECIMAL(65,30) NOT NULL,
    "lastReconciliationDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankImportConfig" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankImportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_bankId_idx" ON "BankAccount"("bankId");

-- CreateIndex
CREATE INDEX "BankAccount_status_idx" ON "BankAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_bankId_accountNumber_key" ON "BankAccount"("bankId", "accountNumber");

-- CreateIndex
CREATE INDEX "Checkbook_bankAccountId_idx" ON "Checkbook"("bankAccountId");

-- CreateIndex
CREATE INDEX "Check_checkbookId_idx" ON "Check"("checkbookId");

-- CreateIndex
CREATE INDEX "Check_status_idx" ON "Check"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Check_checkbookId_number_key" ON "Check"("checkbookId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_requestId_key" ON "Payment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_checkId_key" ON "Payment"("checkId");

-- CreateIndex
CREATE INDEX "Payment_requestId_idx" ON "Payment"("requestId");

-- CreateIndex
CREATE INDEX "Payment_processedById_idx" ON "Payment"("processedById");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "BankMovement_bankAccountId_idx" ON "BankMovement"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankMovement_date_idx" ON "BankMovement"("date");

-- CreateIndex
CREATE INDEX "BankMovement_status_idx" ON "BankMovement"("status");

-- CreateIndex
CREATE INDEX "BankMovement_createdById_idx" ON "BankMovement"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_movementId_key" ON "BankReconciliation"("movementId");

-- CreateIndex
CREATE INDEX "BankReconciliation_bankAccountId_idx" ON "BankReconciliation"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankReconciliation_movementId_idx" ON "BankReconciliation"("movementId");

-- CreateIndex
CREATE INDEX "BankReconciliation_paymentId_idx" ON "BankReconciliation"("paymentId");

-- CreateIndex
CREATE INDEX "BankReconciliation_periodId_idx" ON "BankReconciliation"("periodId");

-- CreateIndex
CREATE INDEX "BankReconciliation_createdById_idx" ON "BankReconciliation"("createdById");

-- CreateIndex
CREATE INDEX "ReconciliationPeriod_bankAccountId_idx" ON "ReconciliationPeriod"("bankAccountId");

-- CreateIndex
CREATE INDEX "ReconciliationPeriod_status_idx" ON "ReconciliationPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationPeriod_bankAccountId_year_month_key" ON "ReconciliationPeriod"("bankAccountId", "year", "month");

-- CreateIndex
CREATE INDEX "BankImportConfig_bankId_idx" ON "BankImportConfig"("bankId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkbook" ADD CONSTRAINT "Checkbook_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_checkbookId_fkey" FOREIGN KEY ("checkbookId") REFERENCES "Checkbook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PaymentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "BankMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReconciliationPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationPeriod" ADD CONSTRAINT "ReconciliationPeriod_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankImportConfig" ADD CONSTRAINT "BankImportConfig_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
