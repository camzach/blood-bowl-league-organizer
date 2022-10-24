/*
  Warnings:

  - You are about to drop the column `learnedSkills` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "learnedSkills",
ADD COLUMN     "totalImprovements" INTEGER NOT NULL DEFAULT 0;
