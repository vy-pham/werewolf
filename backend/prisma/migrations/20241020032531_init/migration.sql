/*
  Warnings:

  - The primary key for the `Room` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `room_id` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP CONSTRAINT "Room_pkey",
DROP COLUMN "room_id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Room_pkey" PRIMARY KEY ("id");
