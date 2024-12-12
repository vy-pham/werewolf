/*
  Warnings:

  - You are about to drop the column `actor_id` on the `GameRoundAction` table. All the data in the column will be lost.
  - Added the required column `ability_id` to the `GameRoundAction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GameRoundAction" DROP CONSTRAINT "GameRoundAction_actor_id_fkey";

-- AlterTable
ALTER TABLE "GameRoundAction" DROP COLUMN "actor_id",
ADD COLUMN     "ability_id" INTEGER NOT NULL;
