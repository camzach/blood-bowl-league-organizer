/*
  Warnings:

  - You are about to drop the column `coachName` on the `Team` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_CoachToTeam" (
    "A" STRING NOT NULL,
    "B" STRING NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CoachToTeam_AB_unique" ON "_CoachToTeam"("A", "B");

-- CreateIndex
CREATE INDEX "_CoachToTeam_B_index" ON "_CoachToTeam"("B");

-- AddForeignKey
ALTER TABLE "_CoachToTeam" ADD CONSTRAINT "_CoachToTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "Coach"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoachToTeam" ADD CONSTRAINT "_CoachToTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add existing coach/team relationships
INSERT INTO "_CoachToTeam" ("A", "B") SELECT "coachName", "name" FROM "Team" WHERE "coachName" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_coachName_fkey";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "coachName";