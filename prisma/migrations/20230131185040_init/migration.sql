-- CreateEnum
CREATE TYPE "TeamState" AS ENUM ('Draft', 'Ready', 'Playing', 'PostGame');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('G', 'M', 'P', 'S', 'A', 'T');

-- CreateEnum
CREATE TYPE "GameState" AS ENUM ('Scheduled', 'Journeymen', 'Inducements', 'InProgress', 'Complete');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('Blizzard', 'PouringRain', 'Perfect', 'VerySunny', 'BlisteringHeat');

-- CreateTable
CREATE TABLE "Coach" (
    "name" STRING NOT NULL,
    "passwordHash" STRING NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" UUID NOT NULL,
    "name" STRING,
    "number" INT4 NOT NULL,
    "playerTeamName" STRING,
    "journeymanTeamName" STRING,
    "nigglingInjuries" INT4 NOT NULL DEFAULT 0,
    "missNextGame" BOOL NOT NULL DEFAULT false,
    "dead" BOOL NOT NULL DEFAULT false,
    "AG" INT4 NOT NULL,
    "MA" INT4 NOT NULL,
    "PA" INT4,
    "ST" INT4 NOT NULL,
    "AV" INT4 NOT NULL,
    "AGImprovements" INT4 NOT NULL DEFAULT 0,
    "MAImprovements" INT4 NOT NULL DEFAULT 0,
    "PAImprovements" INT4 NOT NULL DEFAULT 0,
    "STImprovements" INT4 NOT NULL DEFAULT 0,
    "AVImprovements" INT4 NOT NULL DEFAULT 0,
    "totalImprovements" INT4 NOT NULL DEFAULT 0,
    "starPlayerPoints" INT4 NOT NULL DEFAULT 0,
    "touchdowns" INT4 NOT NULL DEFAULT 0,
    "completions" INT4 NOT NULL DEFAULT 0,
    "deflections" INT4 NOT NULL DEFAULT 0,
    "interceptions" INT4 NOT NULL DEFAULT 0,
    "casualties" INT4 NOT NULL DEFAULT 0,
    "MVPs" INT4 NOT NULL DEFAULT 0,
    "teamValue" INT4 NOT NULL,
    "primary" "SkillCategory"[],
    "secondary" "SkillCategory"[],
    "positionId" UUID NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "name" STRING NOT NULL,
    "treasury" INT4 NOT NULL DEFAULT 1000000,
    "state" "TeamState" NOT NULL DEFAULT 'Draft',
    "rosterName" STRING NOT NULL,
    "rerolls" INT4 NOT NULL DEFAULT 0,
    "cheerleaders" INT4 NOT NULL DEFAULT 0,
    "assistantCoaches" INT4 NOT NULL DEFAULT 0,
    "apothecary" BOOL NOT NULL DEFAULT false,
    "dedicatedFans" INT4 NOT NULL DEFAULT 0,
    "coachName" STRING,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Roster" (
    "name" STRING NOT NULL,
    "rerollCost" INT4 NOT NULL,
    "tier" INT4 NOT NULL,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "SpecialRule" (
    "name" STRING NOT NULL,

    CONSTRAINT "SpecialRule_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "name" STRING NOT NULL,
    "max" INT4 NOT NULL,
    "cost" INT4 NOT NULL,
    "MA" INT4 NOT NULL,
    "ST" INT4 NOT NULL,
    "AG" INT4 NOT NULL,
    "PA" INT4,
    "AV" INT4 NOT NULL,
    "primary" "SkillCategory"[],
    "secondary" "SkillCategory"[],
    "rosterName" STRING NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "name" STRING NOT NULL,
    "rules" STRING NOT NULL,
    "category" "SkillCategory" NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Inducement" (
    "name" STRING NOT NULL,
    "max" INT4 NOT NULL,
    "price" INT4,
    "specialPriceRuleName" STRING,
    "specialPrice" INT4,
    "rules" STRING NOT NULL,

    CONSTRAINT "Inducement_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "StarPlayer" (
    "name" STRING NOT NULL,
    "MA" INT4 NOT NULL,
    "ST" INT4 NOT NULL,
    "PA" INT4,
    "AG" INT4 NOT NULL,
    "AV" INT4 NOT NULL,
    "specialRule" STRING NOT NULL,
    "hiringFee" INT4 NOT NULL,

    CONSTRAINT "StarPlayer_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "InducementOption" (
    "name" STRING NOT NULL,
    "price" INT4,
    "specialPriceRuleName" STRING,
    "specialPrice" INT4,
    "rules" STRING NOT NULL,
    "inducementName" STRING,

    CONSTRAINT "InducementOption_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "round" INT4 NOT NULL,
    "homeTeamName" STRING NOT NULL,
    "awayTeamName" STRING NOT NULL,
    "state" "GameState" NOT NULL DEFAULT 'Scheduled',
    "journeymenHome" INT4 NOT NULL DEFAULT 0,
    "journeymenAway" INT4 NOT NULL DEFAULT 0,
    "pettyCashHome" INT4 NOT NULL DEFAULT 0,
    "pettyCashAway" INT4 NOT NULL DEFAULT 0,
    "touchdownsHome" INT4 NOT NULL DEFAULT 0,
    "touchdownsAway" INT4 NOT NULL DEFAULT 0,
    "casualtiesHome" INT4 NOT NULL DEFAULT 0,
    "casualtiesAway" INT4 NOT NULL DEFAULT 0,
    "fanFacotrHome" INT4 NOT NULL DEFAULT 0,
    "fanFactorAway" INT4 NOT NULL DEFAULT 0,
    "weather" "Weather",

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlayerToSkill" (
    "A" UUID NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_RosterToSpecialRule" (
    "A" STRING NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_SpecialRuleToStarPlayer" (
    "A" STRING NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_PositionToSkill" (
    "A" UUID NOT NULL,
    "B" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "_SkillToStarPlayer" (
    "A" STRING NOT NULL,
    "B" STRING NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Coach_name_key" ON "Coach"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_id_key" ON "Player"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_name_key" ON "Roster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialRule_name_key" ON "SpecialRule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Position_id_key" ON "Position"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Inducement_name_key" ON "Inducement"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StarPlayer_name_key" ON "StarPlayer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InducementOption_name_key" ON "InducementOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Game_id_key" ON "Game"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayerToSkill_AB_unique" ON "_PlayerToSkill"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayerToSkill_B_index" ON "_PlayerToSkill"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RosterToSpecialRule_AB_unique" ON "_RosterToSpecialRule"("A", "B");

-- CreateIndex
CREATE INDEX "_RosterToSpecialRule_B_index" ON "_RosterToSpecialRule"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SpecialRuleToStarPlayer_AB_unique" ON "_SpecialRuleToStarPlayer"("A", "B");

-- CreateIndex
CREATE INDEX "_SpecialRuleToStarPlayer_B_index" ON "_SpecialRuleToStarPlayer"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PositionToSkill_AB_unique" ON "_PositionToSkill"("A", "B");

-- CreateIndex
CREATE INDEX "_PositionToSkill_B_index" ON "_PositionToSkill"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SkillToStarPlayer_AB_unique" ON "_SkillToStarPlayer"("A", "B");

-- CreateIndex
CREATE INDEX "_SkillToStarPlayer_B_index" ON "_SkillToStarPlayer"("B");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_team__fkey" FOREIGN KEY ("playerTeamName") REFERENCES "Team"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_journeyman__fkey" FOREIGN KEY ("journeymanTeamName") REFERENCES "Team"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_rosterName_fkey" FOREIGN KEY ("rosterName") REFERENCES "Roster"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_coachName_fkey" FOREIGN KEY ("coachName") REFERENCES "Coach"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_rosterName_fkey" FOREIGN KEY ("rosterName") REFERENCES "Roster"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inducement" ADD CONSTRAINT "Inducement_specialPriceRuleName_fkey" FOREIGN KEY ("specialPriceRuleName") REFERENCES "SpecialRule"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InducementOption" ADD CONSTRAINT "InducementOption_specialPriceRuleName_fkey" FOREIGN KEY ("specialPriceRuleName") REFERENCES "SpecialRule"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InducementOption" ADD CONSTRAINT "InducementOption_inducementName_fkey" FOREIGN KEY ("inducementName") REFERENCES "Inducement"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "ScheduledGame_home__fkey" FOREIGN KEY ("homeTeamName") REFERENCES "Team"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "ScheduledGame_away__fkey" FOREIGN KEY ("awayTeamName") REFERENCES "Team"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerToSkill" ADD CONSTRAINT "_PlayerToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerToSkill" ADD CONSTRAINT "_PlayerToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RosterToSpecialRule" ADD CONSTRAINT "_RosterToSpecialRule_A_fkey" FOREIGN KEY ("A") REFERENCES "Roster"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RosterToSpecialRule" ADD CONSTRAINT "_RosterToSpecialRule_B_fkey" FOREIGN KEY ("B") REFERENCES "SpecialRule"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpecialRuleToStarPlayer" ADD CONSTRAINT "_SpecialRuleToStarPlayer_A_fkey" FOREIGN KEY ("A") REFERENCES "SpecialRule"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpecialRuleToStarPlayer" ADD CONSTRAINT "_SpecialRuleToStarPlayer_B_fkey" FOREIGN KEY ("B") REFERENCES "StarPlayer"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PositionToSkill" ADD CONSTRAINT "_PositionToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PositionToSkill" ADD CONSTRAINT "_PositionToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToStarPlayer" ADD CONSTRAINT "_SkillToStarPlayer_A_fkey" FOREIGN KEY ("A") REFERENCES "Skill"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToStarPlayer" ADD CONSTRAINT "_SkillToStarPlayer_B_fkey" FOREIGN KEY ("B") REFERENCES "StarPlayer"("name") ON DELETE CASCADE ON UPDATE CASCADE;
