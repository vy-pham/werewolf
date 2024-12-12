/*
  Warnings:

  - You are about to drop the column `role_id` on the `GameRoleAbilities` table. All the data in the column will be lost.
  - Added the required column `ability_id` to the `GameRoleAbilities` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GameRoleAbilities" DROP CONSTRAINT "GameRoleAbilities_role_id_fkey";

-- AlterTable
ALTER TABLE "GameRoleAbilities" DROP COLUMN "role_id",
ADD COLUMN     "ability_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "GameRoleAbilities" ADD CONSTRAINT "GameRoleAbilities_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "RoleAbilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
