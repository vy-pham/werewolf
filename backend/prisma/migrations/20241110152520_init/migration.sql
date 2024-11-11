-- CreateTable
CREATE TABLE "RoomRole" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "RoomRole_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoomRole" ADD CONSTRAINT "RoomRole_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
