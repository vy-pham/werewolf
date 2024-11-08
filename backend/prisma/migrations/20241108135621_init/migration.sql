/*
  Warnings:

  - You are about to drop the column `host_id` on the `Room` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `RoomPlayer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_host_id_fkey";

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "host_id",
ALTER COLUMN "status" SET DEFAULT 'waiting';

-- CreateIndex
CREATE UNIQUE INDEX "RoomPlayer_user_id_key" ON "RoomPlayer"("user_id");
