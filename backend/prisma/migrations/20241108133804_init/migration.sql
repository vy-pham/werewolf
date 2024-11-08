/*
  Warnings:

  - Changed the type of `status` on the `Room` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('waiting', 'playing', 'finished');

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "status",
ADD COLUMN     "status" "RoomStatus" NOT NULL;

-- DropEnum
DROP TYPE "Status";
