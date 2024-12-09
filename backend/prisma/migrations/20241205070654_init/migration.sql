/*
  Warnings:

  - A unique constraint covering the columns `[role_id,name]` on the table `RoleAbilities` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RoleAbilities_role_id_name_key" ON "RoleAbilities"("role_id", "name");
