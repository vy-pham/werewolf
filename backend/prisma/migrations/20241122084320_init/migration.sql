-- DropForeignKey
ALTER TABLE "RoomPlayer" DROP CONSTRAINT "RoomPlayer_user_id_fkey";

-- AlterTable
ALTER TABLE "RoomPlayer" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RoomPlayer" ADD CONSTRAINT "RoomPlayer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
