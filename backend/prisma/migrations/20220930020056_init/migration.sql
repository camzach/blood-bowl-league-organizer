/*
  Warnings:

  - The `specialPrice` column on the `InducementOption` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Inducement" ALTER COLUMN "specialPriceRule" DROP NOT NULL,
ALTER COLUMN "specialPrice" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InducementOption" DROP COLUMN "specialPrice",
ADD COLUMN     "specialPrice" INTEGER;
