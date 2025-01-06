/*
  Warnings:

  - Added the required column `balance` to the `BankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL;
