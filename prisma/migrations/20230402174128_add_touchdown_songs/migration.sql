-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "songName" STRING;

-- CreateTable
CREATE TABLE "Song" (
    "name" STRING NOT NULL,
    "data" STRING NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("name")
);

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_songName_fkey" FOREIGN KEY ("songName") REFERENCES "Song"("name") ON DELETE SET NULL ON UPDATE CASCADE;
