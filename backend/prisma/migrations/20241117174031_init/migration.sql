-- AddForeignKey
ALTER TABLE "RoomRole" ADD CONSTRAINT "RoomRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
