/*
  Warnings:

  - Added the required column `checked` to the `RoomRole` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoomRole" ADD COLUMN     "checked" BOOLEAN NOT NULL;
