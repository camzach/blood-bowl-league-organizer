/*
  Warnings:

  - Added the required column `inducementsAway` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inducementsHome` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "inducementsAway" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Game" ADD COLUMN     "inducementsHome" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "_inducementOptionsHome" (
    "A" UUID NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_inducementOptionsAway" (
    "A" UUID NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_starPlayerHomeGames" (
    "A" UUID NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_starPlayerAwayGames" (
    "A" UUID NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_GameToPlayer" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_inducementOptionsHome_AB_unique" ON "_inducementOptionsHome"("A", "B");

-- CreateIndex
CREATE INDEX "_inducementOptionsHome_B_index" ON "_inducementOptionsHome"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_inducementOptionsAway_AB_unique" ON "_inducementOptionsAway"("A", "B");

-- CreateIndex
CREATE INDEX "_inducementOptionsAway_B_index" ON "_inducementOptionsAway"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_starPlayerHomeGames_AB_unique" ON "_starPlayerHomeGames"("A", "B");

-- CreateIndex
CREATE INDEX "_starPlayerHomeGames_B_index" ON "_starPlayerHomeGames"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_starPlayerAwayGames_AB_unique" ON "_starPlayerAwayGames"("A", "B");

-- CreateIndex
CREATE INDEX "_starPlayerAwayGames_B_index" ON "_starPlayerAwayGames"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_GameToPlayer_AB_unique" ON "_GameToPlayer"("A", "B");

-- CreateIndex
CREATE INDEX "_GameToPlayer_B_index" ON "_GameToPlayer"("B");

-- AddForeignKey
ALTER TABLE "_inducementOptionsHome" ADD CONSTRAINT "_inducementOptionsHome_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_inducementOptionsHome" ADD CONSTRAINT "_inducementOptionsHome_B_fkey" FOREIGN KEY ("B") REFERENCES "InducementOption"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_inducementOptionsAway" ADD CONSTRAINT "_inducementOptionsAway_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_inducementOptionsAway" ADD CONSTRAINT "_inducementOptionsAway_B_fkey" FOREIGN KEY ("B") REFERENCES "InducementOption"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_starPlayerHomeGames" ADD CONSTRAINT "_starPlayerHomeGames_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_starPlayerHomeGames" ADD CONSTRAINT "_starPlayerHomeGames_B_fkey" FOREIGN KEY ("B") REFERENCES "StarPlayer"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_starPlayerAwayGames" ADD CONSTRAINT "_starPlayerAwayGames_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_starPlayerAwayGames" ADD CONSTRAINT "_starPlayerAwayGames_B_fkey" FOREIGN KEY ("B") REFERENCES "StarPlayer"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameToPlayer" ADD CONSTRAINT "_GameToPlayer_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameToPlayer" ADD CONSTRAINT "_GameToPlayer_B_fkey" FOREIGN KEY ("B") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
