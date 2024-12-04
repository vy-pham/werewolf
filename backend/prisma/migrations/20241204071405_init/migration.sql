/*
  Warnings:

  - Made the column `role_id` on table `GamePlayer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "GamePlayer" DROP CONSTRAINT "GamePlayer_role_id_fkey";

-- AlterTable
ALTER TABLE "GamePlayer" ALTER COLUMN "role_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
