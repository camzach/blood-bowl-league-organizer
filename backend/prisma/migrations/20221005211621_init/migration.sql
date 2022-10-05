-- CreateEnum
CREATE TYPE "TeamState" AS ENUM ('Draft', 'Ready', 'Playing', 'PostGame');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('G', 'M', 'P', 'S', 'A', 'T');

-- CreateEnum
CREATE TYPE "GameState" AS ENUM ('Scheduled', 'Journeymen', 'Inducements', 'InProgress', 'Complete');

-- CreateTable
CREATE TABLE "Player" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "playerTeamName" TEXT,
    "journeymanTeamName" TEXT,
    "nigglingInjuries" INTEGER NOT NULL DEFAULT 0,
    "missNextGame" BOOLEAN NOT NULL DEFAULT false,
    "AG" INTEGER NOT NULL,
    "MA" INTEGER NOT NULL,
    "PA" INTEGER,
    "ST" INTEGER NOT NULL,
    "AV" INTEGER NOT NULL,
    "starPlayerPoints" INTEGER NOT NULL DEFAULT 0,
    "teamValue" INTEGER NOT NULL,
    "improvements" INTEGER NOT NULL DEFAULT 0,
    "positionId" UUID NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "name" TEXT NOT NULL,
    "treasury" INTEGER NOT NULL DEFAULT 1000000,
    "state" "TeamState" NOT NULL DEFAULT 'Draft',
    "rosterName" TEXT NOT NULL,
    "rerolls" INTEGER NOT NULL DEFAULT 0,
    "cheerleaders" INTEGER NOT NULL DEFAULT 0,
    "assistantCoaches" INTEGER NOT NULL DEFAULT 0,
    "apothecary" BOOLEAN NOT NULL DEFAULT false,
    "dedicatedFans" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Roster" (
    "name" TEXT NOT NULL,
    "rerollCost" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL,
    "specialRules" TEXT[],

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "max" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "MA" INTEGER NOT NULL,
    "ST" INTEGER NOT NULL,
    "AG" INTEGER NOT NULL,
    "PA" INTEGER,
    "AV" INTEGER NOT NULL,
    "primary" "SkillCategory"[],
    "secondary" "SkillCategory"[],
    "rosterName" TEXT NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "name" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Inducement" (
    "name" TEXT NOT NULL,
    "max" INTEGER NOT NULL,
    "price" INTEGER,
    "specialPriceRule" TEXT,
    "specialPrice" INTEGER,
    "rules" TEXT NOT NULL,

    CONSTRAINT "Inducement_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "StarPlayer" (
    "name" TEXT NOT NULL,
    "MA" INTEGER NOT NULL,
    "ST" INTEGER NOT NULL,
    "PA" INTEGER,
    "AG" INTEGER NOT NULL,
    "AV" INTEGER NOT NULL,
    "specialRule" TEXT NOT NULL,
    "hiringFee" INTEGER NOT NULL,
    "playsFor" TEXT[],
    "doesntPlayFor" TEXT[],

    CONSTRAINT "StarPlayer_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "InducementOption" (
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "specialPriceRule" TEXT,
    "specialPrice" INTEGER,
    "rules" TEXT NOT NULL,
    "inducementName" TEXT,

    CONSTRAINT "InducementOption_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "state" "GameState" NOT NULL DEFAULT 'Scheduled',
    "pettyCashHome" INTEGER NOT NULL DEFAULT 0,
    "pettyCashAway" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlayerToSkill" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PositionToSkill" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_SkillToStarPlayer" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_id_key" ON "Player"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_name_key" ON "Roster"("name");

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
ALTER TABLE "Position" ADD CONSTRAINT "Position_rosterName_fkey" FOREIGN KEY ("rosterName") REFERENCES "Roster"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "_PositionToSkill" ADD CONSTRAINT "_PositionToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PositionToSkill" ADD CONSTRAINT "_PositionToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToStarPlayer" ADD CONSTRAINT "_SkillToStarPlayer_A_fkey" FOREIGN KEY ("A") REFERENCES "Skill"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToStarPlayer" ADD CONSTRAINT "_SkillToStarPlayer_B_fkey" FOREIGN KEY ("B") REFERENCES "StarPlayer"("name") ON DELETE CASCADE ON UPDATE CASCADE;
