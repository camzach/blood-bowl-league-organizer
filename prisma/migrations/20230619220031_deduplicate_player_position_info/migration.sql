/*
  Warnings:

  - You are about to drop the column `AG` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `AV` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `MA` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `PA` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `ST` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `totalImprovements` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "AGInjuries" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN     "AVInjuries" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN     "MAInjuries" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN     "PAInjuries" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN     "STInjuries" INT4 NOT NULL DEFAULT 0;

UPDATE "Player" SET
  "AGInjuries" = "Player"."AG" - ("Position"."AG" - "Player"."AGImprovements"),
  "PAInjuries" = COALESCE(
    "Player"."PA" -
      IF("Position"."PA" is NULL AND "Player"."PAImprovements" > 0,
        7 - "Player"."PAImprovements",
        "Position"."PA" - "Player"."PAImprovements"
      ),
    0
  ),
  "AVInjuries" = ("Position"."AV" + "Player"."AVImprovements") - "Player"."AV",
  "MAInjuries" = ("Position"."MA" + "Player"."MAImprovements") - "Player"."MA",
  "STInjuries" = ("Position"."ST" + "Player"."STImprovements") - "Player"."ST"
  FROM "Position"
  WHERE "Player"."positionId" = "Position"."id";

DELETE FROM "_PlayerToSkill"
  WHERE EXISTS (
    SELECT 1 FROM "_PositionToSkill"
    INNER JOIN "Player" ON "_PositionToSkill"."A" = "Player"."positionId"
    WHERE "_PlayerToSkill"."B" = "_PositionToSkill"."B"
  );

ALTER TABLE "Player" DROP COLUMN "AG";
ALTER TABLE "Player" DROP COLUMN "AV";
ALTER TABLE "Player" DROP COLUMN "MA";
ALTER TABLE "Player" DROP COLUMN "PA";
ALTER TABLE "Player" DROP COLUMN "ST";
ALTER TABLE "Player" DROP COLUMN "totalImprovements";
