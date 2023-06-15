/*
  Warnings:

  - You are about to drop the column `round` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "roundRobinRoundId" UUID;

-- CreateTable
CREATE TABLE "Season" (
    "name" STRING NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "RoundRobin" (
    "id" UUID NOT NULL,
    "seasonName" STRING NOT NULL,

    CONSTRAINT "RoundRobin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundRobinRound" (
    "id" UUID NOT NULL,
    "roundRobinId" UUID NOT NULL,
    "number" INT4 NOT NULL,

    CONSTRAINT "RoundRobinRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bracket" (
    "id" UUID NOT NULL,
    "seasonName" STRING NOT NULL,

    CONSTRAINT "Bracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketRound" (
    "id" UUID NOT NULL,
    "number" INT4 NOT NULL,
    "bracketId" UUID NOT NULL,

    CONSTRAINT "BracketRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketGame" (
    "id" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "seed" INT4 NOT NULL,
    "gameId" UUID,

    CONSTRAINT "BracketGame_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Season" ("name")
    SELECT 'Test Season' FROM "Game" LIMIT 1;

INSERT INTO "RoundRobin" ("id", "seasonName")
    SELECT gen_random_uuid(), "name" FROM "Season" LIMIT 1;

INSERT INTO "RoundRobinRound" ("number", "id", "roundRobinId")
    SELECT DISTINCT ON ("Game"."round") "Game"."round", gen_random_uuid(), "RoundRobin"."id"
    FROM "Game" CROSS JOIN "RoundRobin" WHERE 1=1;

UPDATE "Game"
    SET "roundRobinRoundId" = "RoundRobinRound"."id"
    FROM "RoundRobinRound"
    WHERE "Game"."round" = "RoundRobinRound"."number";

ALTER TABLE "Game" DROP COLUMN "round";

-- CreateIndex
CREATE UNIQUE INDEX "Season_name_key" ON "Season"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobin_id_key" ON "RoundRobin"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobin_seasonName_key" ON "RoundRobin"("seasonName");

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobinRound_id_key" ON "RoundRobinRound"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobinRound_roundRobinId_number_key" ON "RoundRobinRound"("roundRobinId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_id_key" ON "Bracket"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_seasonName_key" ON "Bracket"("seasonName");

-- CreateIndex
CREATE UNIQUE INDEX "BracketRound_id_key" ON "BracketRound"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BracketRound_bracketId_number_key" ON "BracketRound"("bracketId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "BracketGame_id_key" ON "BracketGame"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BracketGame_gameId_key" ON "BracketGame"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketGame_seed_roundId_key" ON "BracketGame"("seed", "roundId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_roundRobinRoundId_fkey" FOREIGN KEY ("roundRobinRoundId") REFERENCES "RoundRobinRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobin" ADD CONSTRAINT "RoundRobin_seasonName_fkey" FOREIGN KEY ("seasonName") REFERENCES "Season"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobinRound" ADD CONSTRAINT "RoundRobinRound_roundRobinId_fkey" FOREIGN KEY ("roundRobinId") REFERENCES "RoundRobin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_seasonName_fkey" FOREIGN KEY ("seasonName") REFERENCES "Season"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketRound" ADD CONSTRAINT "BracketRound_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketGame" ADD CONSTRAINT "BracketGame_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "BracketRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketGame" ADD CONSTRAINT "BracketGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
