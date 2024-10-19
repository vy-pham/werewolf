-- CreateEnum
CREATE TYPE "Status" AS ENUM ('waiting', 'playing', 'finished');

-- CreateTable
CREATE TABLE "Room" (
    "room_id" SERIAL NOT NULL,
    "room_name" TEXT NOT NULL,
    "host_id" INTEGER NOT NULL,
    "max_players" INTEGER NOT NULL,
    "status" "Status" NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("room_id")
);

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
