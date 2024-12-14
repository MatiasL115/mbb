-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "bankInfo" JSONB,
ADD COLUMN     "contactInfo" JSONB,
ALTER COLUMN "ruc" DROP NOT NULL;
