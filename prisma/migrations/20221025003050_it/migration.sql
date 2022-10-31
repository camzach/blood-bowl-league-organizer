/*
  Warnings:

  - You are about to drop the column `casAway` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `casHome` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `pettyCashAway` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `pettyCashHome` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `tdAway` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `tdHome` on the `Game` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('Blizzard', 'PouringRain', 'Perfect', 'VerySunny', 'BlisteringHeat');

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "casAway",
DROP COLUMN "casHome",
DROP COLUMN "pettyCashAway",
DROP COLUMN "pettyCashHome",
DROP COLUMN "tdAway",
DROP COLUMN "tdHome",
ADD COLUMN     "casualties" INTEGER[],
ADD COLUMN     "fanFactor" INTEGER[],
ADD COLUMN     "pettyCash" INTEGER[],
ADD COLUMN     "touchdowns" INTEGER[],
ADD COLUMN     "weather" "Weather";
