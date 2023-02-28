-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "dedicatedFans" SET DEFAULT 1;
UPDATE "Team" SET "dedicatedFans" = "dedicatedFans" + 1;
