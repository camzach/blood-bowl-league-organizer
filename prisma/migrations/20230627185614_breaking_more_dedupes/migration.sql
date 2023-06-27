/*
  Warnings:

  - You are about to drop the column `AGImprovements` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `AVImprovements` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `MAImprovements` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `PAImprovements` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `STImprovements` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `primary` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `secondary` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `starPlayerPoints` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `teamValue` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the `_PlayerToSkill` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ImprovementType" AS ENUM ('ST', 'MA', 'AG', 'PA', 'AV', 'ChosenSkill', 'RandomSkill', 'FallbackSkill');

-- DropForeignKey
ALTER TABLE "_PlayerToSkill" DROP CONSTRAINT "_PlayerToSkill_A_fkey";

-- DropForeignKey
ALTER TABLE "_PlayerToSkill" DROP CONSTRAINT "_PlayerToSkill_B_fkey";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "AGImprovements";
ALTER TABLE "Player" DROP COLUMN "AVImprovements";
ALTER TABLE "Player" DROP COLUMN "MAImprovements";
ALTER TABLE "Player" DROP COLUMN "PAImprovements";
ALTER TABLE "Player" DROP COLUMN "STImprovements";
ALTER TABLE "Player" DROP COLUMN "primary";
ALTER TABLE "Player" DROP COLUMN "secondary";
ALTER TABLE "Player" DROP COLUMN "starPlayerPoints";
ALTER TABLE "Player" DROP COLUMN "teamValue";

-- DropTable
DROP TABLE "_PlayerToSkill";

-- CreateTable
CREATE TABLE "Improvement" (
    "type" "ImprovementType" NOT NULL,
    "playerId" UUID NOT NULL,
    "order" INT4 NOT NULL,
    "skillName" STRING,

    CONSTRAINT "Improvement_pkey" PRIMARY KEY ("playerId","order")
);

-- AddForeignKey
ALTER TABLE "Improvement" ADD CONSTRAINT "Improvement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Improvement" ADD CONSTRAINT "Improvement_skillName_fkey" FOREIGN KEY ("skillName") REFERENCES "Skill"("name") ON DELETE SET NULL ON UPDATE CASCADE;
