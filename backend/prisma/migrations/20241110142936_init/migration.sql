/*
  Warnings:

  - A unique constraint covering the columns `[enum]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `enum` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `RoomPlayer` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('werewolf', 'seer', 'witch', 'doctor');

-- DropForeignKey
ALTER TABLE "RoomPlayer" DROP CONSTRAINT "RoomPlayer_user_id_fkey";

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "enum" "Roles" NOT NULL;

-- AlterTable
ALTER TABLE "RoomPlayer" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Role_enum_key" ON "Role"("enum");

-- AddForeignKey
ALTER TABLE "RoomPlayer" ADD CONSTRAINT "RoomPlayer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
