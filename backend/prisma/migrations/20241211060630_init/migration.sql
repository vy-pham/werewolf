/*
  Warnings:

  - Added the required column `game_id` to the `GameRoleAbilities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GameRoleAbilities" ADD COLUMN     "game_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "type" SET DEFAULT 'support';

-- AddForeignKey
ALTER TABLE "GameRoleAbilities" ADD CONSTRAINT "GameRoleAbilities_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
