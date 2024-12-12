/*
  Warnings:

  - You are about to drop the `GameRoleAbilities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoleAbilities` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GameRoleAbilities" DROP CONSTRAINT "GameRoleAbilities_ability_id_fkey";

-- DropForeignKey
ALTER TABLE "GameRoleAbilities" DROP CONSTRAINT "GameRoleAbilities_game_id_fkey";

-- DropForeignKey
ALTER TABLE "RoleAbilities" DROP CONSTRAINT "RoleAbilities_role_id_fkey";

-- DropTable
DROP TABLE "GameRoleAbilities";

-- DropTable
DROP TABLE "RoleAbilities";

-- CreateTable
CREATE TABLE "GameAbility" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "ability_id" INTEGER NOT NULL,
    "total_uses" INTEGER NOT NULL,
    "uses_per_round" INTEGER NOT NULL,

    CONSTRAINT "GameAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAbility" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "total_uses" INTEGER NOT NULL,
    "uses_per_round" INTEGER NOT NULL,

    CONSTRAINT "RoleAbility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_id_name" ON "RoleAbility"("role_id", "name");

-- AddForeignKey
ALTER TABLE "GameAbility" ADD CONSTRAINT "GameAbility_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAbility" ADD CONSTRAINT "GameAbility_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "RoleAbility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAbility" ADD CONSTRAINT "RoleAbility_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
