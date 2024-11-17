-- DropForeignKey
ALTER TABLE "RoomPlayer" DROP CONSTRAINT "RoomPlayer_room_id_fkey";

-- AddForeignKey
ALTER TABLE "RoomPlayer" ADD CONSTRAINT "RoomPlayer_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
