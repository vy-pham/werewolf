/*
  Warnings:

  - You are about to drop the column `uses_per_round` on the `GameAbility` table. All the data in the column will be lost.
  - Added the required column `uses_this_round` to the `GameAbility` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GameAbility" DROP COLUMN "uses_per_round",
ADD COLUMN     "uses_this_round" INTEGER NOT NULL;
