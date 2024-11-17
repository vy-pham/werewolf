-- DropForeignKey
ALTER TABLE "RoomRole" DROP CONSTRAINT "RoomRole_room_id_fkey";

-- AddForeignKey
ALTER TABLE "RoomRole" ADD CONSTRAINT "RoomRole_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
