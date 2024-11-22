/*
  Warnings:

  - You are about to drop the column `max_players` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "max_players";

-- AlterTable
ALTER TABLE "RoomPlayer" ADD COLUMN     "virtual" TEXT;
