/*
  Warnings:

  - Added the required column `time` to the `GameRound` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameRoundTime" AS ENUM ('day', 'night');

-- AlterTable
ALTER TABLE "GameRound" ADD COLUMN     "time" "GameRoundTime" NOT NULL;
