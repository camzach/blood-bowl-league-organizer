-- CreateTable
CREATE TABLE "ScheduledGame" (
    "id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,

    CONSTRAINT "ScheduledGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledGame_id_key" ON "ScheduledGame"("id");

-- AddForeignKey
ALTER TABLE "ScheduledGame" ADD CONSTRAINT "ScheduledGame_home__fkey" FOREIGN KEY ("homeTeamName") REFERENCES "Team"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledGame" ADD CONSTRAINT "ScheduledGame_away__fkey" FOREIGN KEY ("awayTeamName") REFERENCES "Team"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
