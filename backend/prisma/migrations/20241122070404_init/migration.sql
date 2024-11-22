-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('support', 'multiplayer');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "type" "RoomType" NOT NULL DEFAULT 'multiplayer';
