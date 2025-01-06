/*
  Warnings:

  - A unique constraint covering the columns `[ruc]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mimeType` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "ruc" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "uploadedBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_ruc_key" ON "Client"("ruc");

-- CreateIndex
CREATE INDEX "Client_ruc_idx" ON "Client"("ruc");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");
