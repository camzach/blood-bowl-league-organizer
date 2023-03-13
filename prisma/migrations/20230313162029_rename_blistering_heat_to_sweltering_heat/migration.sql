/*
  Warnings:

  - The values [BlisteringHeat] on the enum `Weather` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "Weather"ADD VALUE 'SwelteringHeat';
ALTER TYPE "Weather"DROP VALUE 'BlisteringHeat';
