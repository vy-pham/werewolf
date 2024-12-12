/*
  Warnings:

  - You are about to drop the column `target_status` on the `GameRoundAction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GameRoundAction" DROP COLUMN "target_status";

-- DropEnum
DROP TYPE "GameRoundActionTargetStatus";
