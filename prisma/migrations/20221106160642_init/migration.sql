/*
  Warnings:

  - You are about to drop the column `casualties` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `fanFactor` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `pettyCash` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `touchdowns` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "casualties",
DROP COLUMN "fanFactor",
DROP COLUMN "pettyCash",
DROP COLUMN "touchdowns",
ADD COLUMN     "casualtiesAway" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "casualtiesHome" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fanFacotrHome" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fanFactorAway" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pettyCashAway" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pettyCashHome" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "touchdownsAway" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "touchdownsHome" INTEGER NOT NULL DEFAULT 0;
