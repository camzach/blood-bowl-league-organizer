-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "redraftTeamName" STRING;
ALTER TABLE "Player" ADD COLUMN     "seasonsPlayed" INT4 NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_redrafts__fkey" FOREIGN KEY ("redraftTeamName") REFERENCES "Team"("name") ON DELETE SET NULL ON UPDATE CASCADE;
